package com.brainx.ingestion.controller;

import com.brainx.ingestion.dto.request.IngestionRequest.AssetUploadCompleteRequest;
import com.brainx.ingestion.dto.request.IngestionRequest.AssetUploadSessionCreateRequest;
import com.brainx.ingestion.dto.response.ApiResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.AssetDetailResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.AssetUploadCompleteResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.AssetUploadSessionResponse;
import com.brainx.ingestion.entity.Asset;
import com.brainx.ingestion.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    // TEMP: 로그인 없이 테스트할 때 쓰는 고정 사용자 ID. 실제 로그인 연동 완료 후 제거할 것.
    private static final String DEV_TEST_USER_ID = "dev-test-user";

    private static String resolveUserId(Authentication auth) {
        return auth != null ? auth.getName() : DEV_TEST_USER_ID;
    }

    // POST /api/v1/assets/upload-sessions
    @PostMapping("/upload-sessions")
    public ResponseEntity<ApiResponse<AssetUploadSessionResponse>> createUploadSession(
            Authentication auth,
            @Valid @RequestBody AssetUploadSessionCreateRequest request) {
        AssetUploadSessionResponse data = assetService.createUploadSession(resolveUserId(auth), request);
        return ResponseEntity.ok(ApiResponse.success(data, "업로드 세션이 생성되었습니다."));
    }

    // PUT /api/v1/assets/upload-sessions/{uploadSessionId}/binary
    // SSOT의 uploadUrl이 가리키는 자체 바이너리 업로드 엔드포인트 (사전 서명 URL 인프라 부재로 임시 대체).
    @PutMapping(value = "/upload-sessions/{uploadSessionId}/binary", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<Void>> uploadBinary(
            Authentication auth,
            @PathVariable String uploadSessionId,
            @RequestParam("file") MultipartFile file) {
        assetService.uploadBinary(resolveUserId(auth), uploadSessionId, file);
        return ResponseEntity.ok(ApiResponse.success(null, "파일이 업로드되었습니다."));
    }

    // POST /api/v1/assets/upload-sessions/{uploadSessionId}/complete
    @PostMapping("/upload-sessions/{uploadSessionId}/complete")
    public ResponseEntity<ApiResponse<AssetUploadCompleteResponse>> completeUpload(
            Authentication auth,
            @PathVariable String uploadSessionId,
            @Valid @RequestBody AssetUploadCompleteRequest request) {
        AssetUploadCompleteResponse data = assetService.completeUpload(resolveUserId(auth), uploadSessionId, request);
        return ResponseEntity.ok(ApiResponse.success(data, "업로드가 완료되었습니다."));
    }

    // GET /api/v1/assets/{assetId}
    // 노트 뷰어가 일반 네비게이션(iframe/img 등)으로 불러올 수 있어 소유자 검증을 하지 않는다.
    @GetMapping("/{assetId}")
    public ResponseEntity<ApiResponse<AssetDetailResponse>> getAsset(@PathVariable String assetId) {
        AssetDetailResponse data = assetService.getAssetDetail(assetId);
        return ResponseEntity.ok(ApiResponse.success(data, "파일 조회 성공"));
    }

    // GET /api/v1/assets/{assetId}/file
    // 원본 바이너리를 그대로 스트리밍한다. 노트 안의 PDF 임베드 뷰어(iframe)가 src로 사용하며,
    // 브라우저의 일반 네비게이션은 Authorization 헤더를 보내지 않으므로 소유자 검증을 하지 않는다.
    @GetMapping("/{assetId}/file")
    public ResponseEntity<byte[]> getAssetFile(@PathVariable String assetId) {
        Asset asset = assetService.getAssetForViewing(assetId);
        byte[] bytes = assetService.readBytes(asset);
        MediaType mediaType = asset.getContentType() != null
                ? MediaType.parseMediaType(asset.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(asset.getFileName()).build().toString())
                .body(bytes);
    }
}
