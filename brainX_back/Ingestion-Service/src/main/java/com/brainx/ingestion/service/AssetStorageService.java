package com.brainx.ingestion.service;

import com.brainx.ingestion.exception.BrainXException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * 사전 서명(pre-signed) 업로드용 외부 스토리지(S3 등)가 아직 없으므로,
 * SSOT의 uploadUrl을 자체 바이너리 업로드 엔드포인트로 가리키고 로컬 디스크에 저장한다.
 */
@Slf4j
@Service
public class AssetStorageService {

    @Value("${asset.storage-dir:./asset-storage}")
    private String storageDir;

    public Path resolvePath(String assetId, String fileName) {
        try {
            Path dir = Paths.get(storageDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String safeName = assetId + "_" + fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
            return dir.resolve(safeName);
        } catch (IOException e) {
            throw BrainXException.internalError("저장 경로 생성에 실패했습니다: " + e.getMessage());
        }
    }

    public long store(Path target, InputStream input) {
        try {
            return Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw BrainXException.internalError("파일 저장에 실패했습니다: " + e.getMessage());
        }
    }

    public byte[] read(String storagePath) {
        try {
            return Files.readAllBytes(Paths.get(storagePath));
        } catch (IOException e) {
            throw BrainXException.internalError("파일을 읽을 수 없습니다: " + e.getMessage());
        }
    }
}
