package com.brainx.identity.controller;

import com.brainx.identity.dto.request.SupportInquiryRequest;
import com.brainx.identity.dto.response.ApiResponse;
import com.brainx.identity.dto.response.SupportInquiryResponse;
import com.brainx.identity.security.CustomUserDetails;
import com.brainx.identity.service.SupportInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/support/inquiries")
@RequiredArgsConstructor
public class SupportInquiryController {

    private final SupportInquiryService supportInquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SupportInquiryResponse>>> getMyInquiries(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(supportInquiryService.getMyInquiries(userDetails.getUserId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportInquiryResponse>> createInquiry(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SupportInquiryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(supportInquiryService.createInquiry(userDetails.getUserId(), request)));
    }
}
