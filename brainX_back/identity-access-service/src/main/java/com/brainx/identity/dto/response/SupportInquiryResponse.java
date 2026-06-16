package com.brainx.identity.dto.response;

import com.brainx.identity.entity.SupportInquiry;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SupportInquiryResponse {
    private String inquiryId;
    private String category;
    private String title;
    private String content;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SupportInquiryResponse from(SupportInquiry inquiry) {
        return SupportInquiryResponse.builder()
                .inquiryId(inquiry.getInquiryId())
                .category(inquiry.getCategory())
                .title(inquiry.getTitle())
                .content(inquiry.getContent())
                .status(inquiry.getStatus().name())
                .createdAt(inquiry.getCreatedAt())
                .updatedAt(inquiry.getUpdatedAt())
                .build();
    }
}
