package brain.web.mvc.controller;

import brain.web.mvc.dto.request.SupportTicketCreateRequest;
import brain.web.mvc.dto.response.ApiResponse;
import brain.web.mvc.dto.response.SupportTicketResponses.SupportTicketData;
import brain.web.mvc.dto.response.SupportTicketResponses.SupportTicketDetailData;
import brain.web.mvc.dto.response.SupportTicketResponses.SupportTicketListData;
import brain.web.mvc.service.SupportInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportInquiryController {

    private final SupportInquiryService supportInquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<SupportTicketListData>> getMyTickets(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                supportInquiryService.getMyTickets(userDetails.getUsername()),
                "문의 목록 조회 성공"
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SupportTicketData>> createTicket(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SupportTicketCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        supportInquiryService.createTicket(userDetails.getUsername(), request),
                        "문의가 접수되었습니다."
                ));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<SupportTicketDetailData>> getMyTicket(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String ticketId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                supportInquiryService.getMyTicket(userDetails.getUsername(), ticketId),
                "문의 상세 조회 성공"
        ));
    }
}
