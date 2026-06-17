package brain.web.mvc.dto.response;

import brain.web.mvc.entity.SupportInquiry;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record SupportInquiryResponse(
        String inquiryId,
        String category,
        String title,
        String content,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
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
