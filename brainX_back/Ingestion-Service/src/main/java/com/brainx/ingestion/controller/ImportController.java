package com.brainx.ingestion.controller;

import com.brainx.ingestion.dto.request.IngestionRequest.*;
import com.brainx.ingestion.dto.response.ApiResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.*;
import com.brainx.ingestion.service.ImportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/imports")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;

    // TEMP: 로그인 없이 테스트할 때 쓰는 고정 사용자 ID. 실제 로그인 연동 완료 후 제거할 것.
    private static final String DEV_TEST_USER_ID = "dev-test-user";

    private static String resolveUserId(Authentication auth) {
        return auth != null ? auth.getName() : DEV_TEST_USER_ID;
    }

    // POST /api/v1/imports/notion/oauth/authorize
    @PostMapping("/notion/oauth/authorize")
    public ResponseEntity<ApiResponse<NotionAuthorizeResponse>> authorizeNotion(Authentication auth) {
        NotionAuthorizeResponse data = importService.generateNotionOAuthUrl(resolveUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(data, "Notion 연결 URL이 생성되었습니다."));
    }

    // POST /api/v1/imports/notion/oauth/callback
    @PostMapping("/notion/oauth/callback")
    public ResponseEntity<ApiResponse<IntegrationConnectedResponse>> notionCallback(
            Authentication auth,
            @Valid @RequestBody NotionOAuthCallbackRequest request) {
        IntegrationConnectedResponse data = importService.handleNotionCallback(resolveUserId(auth), request);
        return ResponseEntity.ok(ApiResponse.success(data, "Notion 연동이 완료되었습니다."));
    }

    // GET /api/v1/imports/notion/pages?integrationAccountId=xxx
    @GetMapping("/notion/pages")
    public ResponseEntity<ApiResponse<NotionPageListResponse>> getNotionPages(
            Authentication auth,
            @RequestParam String integrationAccountId) {
        NotionPageListResponse data = NotionPageListResponse.from(
                importService.getNotionPages(resolveUserId(auth), integrationAccountId));
        return ResponseEntity.ok(ApiResponse.success(data, "Notion 페이지 목록 조회 성공"));
    }

    // POST /api/v1/imports/notion/jobs
    @PostMapping("/notion/jobs")
    public ResponseEntity<ApiResponse<ImportJobCreatedResponse>> createNotionJob(
            Authentication auth,
            @Valid @RequestBody NotionImportJobRequest request,
            HttpServletRequest httpRequest) {
        String jwtToken = extractToken(httpRequest);
        ImportJobCreatedResponse data = importService.createNotionImportJob(resolveUserId(auth), request, jwtToken);
        String message = "COMPLETED".equals(data.getStatus())
                ? "Notion 페이지를 성공적으로 가져왔습니다."
                : "FAILED".equals(data.getStatus())
                ? "Notion 가져오기에 실패했습니다."
                : "Notion 가져오기를 시작합니다.";
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(data, message));
    }

    // POST /api/v1/imports/obsidian/jobs
    @PostMapping("/obsidian/jobs")
    public ResponseEntity<ApiResponse<ImportJobCreatedResponse>> createObsidianJob(
            Authentication auth,
            @Valid @RequestBody ObsidianImportJobRequest request) {
        ImportJobCreatedResponse data = importService.createObsidianImportJob(auth.getName(), request);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(data, "Obsidian Vault 가져오기를 시작합니다."));
    }

    // GET /api/v1/imports/{importJobId}
    @GetMapping("/{importJobId}")
    public ResponseEntity<ApiResponse<ImportJobStatusResponse>> getImportJobStatus(
            Authentication auth,
            @PathVariable String importJobId) {
        ImportJobStatusResponse data = importService.getImportJobStatus(resolveUserId(auth), importJobId);
        return ResponseEntity.ok(ApiResponse.success(data, "가져오기 작업 조회 성공"));
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) return bearer.substring(7);
        return null;
    }
}
