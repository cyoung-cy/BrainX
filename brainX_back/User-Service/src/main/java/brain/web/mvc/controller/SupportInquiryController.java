package brain.web.mvc.controller;

import brain.web.mvc.dto.request.SupportInquiryRequest;
import brain.web.mvc.dto.response.ApiResponse;
import brain.web.mvc.dto.response.SupportInquiryResponse;
import brain.web.mvc.service.SupportInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/support/inquiries")
@RequiredArgsConstructor
public class SupportInquiryController {

    private final SupportInquiryService supportInquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SupportInquiryResponse>>> getMyInquiries(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                supportInquiryService.getMyInquiries(userDetails.getUsername()),
                "문의 내역 조회 성공"
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportInquiryResponse>> createInquiry(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SupportInquiryRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        supportInquiryService.createInquiry(userDetails.getUsername(), request),
                        "문의가 접수되었습니다."
                ));
    }
}
