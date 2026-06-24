package com.brainx.ingestion.service;

import com.brainx.ingestion.dto.request.IngestionRequest.AssetUploadCompleteRequest;
import com.brainx.ingestion.dto.request.IngestionRequest.AssetUploadSessionCreateRequest;
import com.brainx.ingestion.dto.response.IngestionResponse.AssetDetailResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.AssetUploadCompleteResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.AssetUploadSessionResponse;
import com.brainx.ingestion.entity.Asset;
import com.brainx.ingestion.exception.BrainXException;
import com.brainx.ingestion.repository.AssetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;
    private final AssetStorageService storageService;

    @Value("${asset.max-size-bytes:5368709120}")
    private long maxSizeBytes;

    @Value("${server.port:8083}")
    private String serverPort;

    @Transactional
    public AssetUploadSessionResponse createUploadSession(String userId, AssetUploadSessionCreateRequest request) {
        if (request.getSizeBytes() > maxSizeBytes) {
            throw BrainXException.badRequest("FILE_TOO_LARGE", "파일 크기가 허용된 최대치를 초과했습니다");
        }
        Asset asset = Asset.builder()
                .userId(userId)
                .fileName(request.getFileName())
                .contentType(request.getContentType())
                .sizeBytes(request.getSizeBytes())
                .targetNoteId(request.getTargetNoteId())
                .status(Asset.Status.PENDING_UPLOAD)
                .build();
        assetRepository.save(asset);

        // 사전 서명 URL 인프라(S3 등)가 없으므로, 자체 바이너리 업로드 엔드포인트를 uploadUrl로 반환한다.
        String uploadUrl = "/api/v1/assets/upload-sessions/" + asset.getAssetId() + "/binary";
        log.info("업로드 세션 생성: assetId={}, fileName={}", asset.getAssetId(), asset.getFileName());
        return AssetUploadSessionResponse.builder()
                .uploadSessionId(asset.getAssetId())
                .uploadUrl(uploadUrl)
                .maxSizeBytes(maxSizeBytes)
                .build();
    }

    @Transactional
    public void uploadBinary(String userId, String uploadSessionId, MultipartFile file) {
        Asset asset = assetRepository.findByAssetIdAndUserId(uploadSessionId, userId)
                .orElseThrow(() -> BrainXException.notFound("업로드 세션을 찾을 수 없습니다"));
        if (asset.getStatus() != Asset.Status.PENDING_UPLOAD) {
            throw BrainXException.badRequest("INVALID_STATE", "이미 처리된 업로드 세션입니다");
        }
        Path target = storageService.resolvePath(asset.getAssetId(), asset.getFileName());
        long written;
        try {
            written = storageService.store(target, file.getInputStream());
        } catch (IOException e) {
            throw BrainXException.internalError("파일 업로드에 실패했습니다: " + e.getMessage());
        }
        asset.setStoragePath(target.toString());
        asset.setSizeBytes(written);
        assetRepository.save(asset);
        log.info("바이너리 업로드 완료: assetId={}, bytes={}", asset.getAssetId(), written);
    }

    @Transactional
    public AssetUploadCompleteResponse completeUpload(String userId, String uploadSessionId, AssetUploadCompleteRequest request) {
        Asset asset = assetRepository.findByAssetIdAndUserId(uploadSessionId, userId)
                .orElseThrow(() -> BrainXException.notFound("업로드 세션을 찾을 수 없습니다"));
        if (asset.getStoragePath() == null) {
            throw BrainXException.badRequest("NOT_UPLOADED", "바이너리가 아직 업로드되지 않았습니다");
        }
        asset.setChecksum(request.getChecksum());
        asset.setStatus(Asset.Status.UPLOADED);
        assetRepository.save(asset);
        log.info("업로드 완료 처리: assetId={}", asset.getAssetId());

        // 변환(마크다운 추출/노트 생성)은 /api/v1/imports/file/jobs 또는 /api/v1/imports/obsidian/jobs에서
        // 동기적으로 수행되므로, 여기서는 별도의 conversionJobId를 발급하지 않는다.
        return AssetUploadCompleteResponse.builder()
                .assetId(asset.getAssetId())
                .conversionJobId(null)
                .status("UPLOADED")
                .build();
    }

    public Asset getOwnedAsset(String userId, String assetId) {
        return assetRepository.findByAssetIdAndUserId(assetId, userId)
                .orElseThrow(() -> BrainXException.notFound("파일을 찾을 수 없습니다"));
    }

    /**
     * 소유자 검증 없이 assetId만으로 조회한다. 노트 안의 PDF 임베드 뷰어(<iframe src>)나
     * <img src> 같은 일반 브라우저 네비게이션은 Authorization 헤더를 보낼 수 없어서
     * resolveUserId(auth)가 항상 dev-test-user로 떨어지므로, 실제 소유자와 다르면
     * getOwnedAsset이 매번 NOT_FOUND를 낸다. 노트 뷰어 용도의 읽기 전용 조회이므로 허용한다.
     * TEMP: 실제 로그인 연동(쿠키 기반 인증 등) 완료 후에는 소유자 검증을 다시 넣어야 한다.
     */
    public Asset getAssetForViewing(String assetId) {
        return assetRepository.findById(assetId)
                .orElseThrow(() -> BrainXException.notFound("파일을 찾을 수 없습니다"));
    }

    public byte[] readBytes(Asset asset) {
        return storageService.read(asset.getStoragePath());
    }

    /**
     * 브라우저가 보낸 contentType이 비어있거나(application/octet-stream) 부정확하면
     * 임베드 뷰어(img/iframe)가 원본을 제대로 렌더링하지 못하므로, 확장자 기반으로 판단한
     * 정확한 MIME 타입으로 덮어쓴다.
     */
    @Transactional
    public void ensureContentType(Asset asset, String contentType) {
        if (contentType != null && !contentType.equals(asset.getContentType())) {
            asset.setContentType(contentType);
            assetRepository.save(asset);
        }
    }

    /**
     * ZIP 내부에서 추출된 PDF처럼, 별도의 업로드 세션 없이 이미 메모리에 있는 바이트를
     * 그대로 자산으로 저장한다(노트 안에서 원본 PDF를 임베드 뷰어로 보여주기 위해 필요).
     */
    @Transactional
    public Asset persistDerivedAsset(String userId, String fileName, String contentType, byte[] bytes) {
        Asset asset = Asset.builder()
                .userId(userId)
                .fileName(fileName)
                .contentType(contentType)
                .sizeBytes((long) bytes.length)
                .status(Asset.Status.UPLOADED)
                .build();
        assetRepository.save(asset);
        Path target = storageService.resolvePath(asset.getAssetId(), fileName);
        storageService.store(target, new java.io.ByteArrayInputStream(bytes));
        asset.setStoragePath(target.toString());
        assetRepository.save(asset);
        return asset;
    }

    public AssetDetailResponse getAssetDetail(String assetId) {
        Asset asset = getAssetForViewing(assetId);
        return AssetDetailResponse.builder()
                .assetId(asset.getAssetId())
                .fileName(asset.getFileName())
                .contentType(asset.getContentType())
                .sizeBytes(asset.getSizeBytes() != null ? asset.getSizeBytes() : 0L)
                .variants(java.util.List.of())
                .downloadUrl("/api/v1/assets/" + asset.getAssetId() + "/file")
                .createdAt(asset.getCreatedAt())
                .build();
    }
}
