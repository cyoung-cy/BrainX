package com.brainx.ingestion.controller;

import com.brainx.ingestion.dto.request.IngestionRequest.ExtensionCaptureRequest;
import com.brainx.ingestion.dto.response.ApiResponse;
import com.brainx.ingestion.dto.response.IngestionResponse.ExtensionCaptureResponse;
import com.brainx.ingestion.service.ExtensionCaptureService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// SSOT: POST /api/v1/extension/captures (operationId: captureFromExtension)
// Consumer: chrome-extension (external-client)
// Produces: CaptureReceived
@RestController
@RequestMapping("/api/v1/extension")
@RequiredArgsConstructor
public class ExtensionCaptureController {

    private final ExtensionCaptureService extensionCaptureService;

    @PostMapping("/captures")
    public ResponseEntity<ApiResponse<ExtensionCaptureResponse>> captureFromExtension(
            Authentication auth,
            @Valid @RequestBody ExtensionCaptureRequest request,
            HttpServletRequest httpRequest) {

        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("UNAUTHORIZED", "인증이 필요합니다."));
        }

        String jwtToken = extractToken(httpRequest);
        ExtensionCaptureResponse data = extensionCaptureService.capture(auth.getName(), request, jwtToken);
        return ResponseEntity.ok(ApiResponse.success(data, "캡처가 저장되었습니다."));
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) return bearer.substring(7);
        return null;
    }
}
