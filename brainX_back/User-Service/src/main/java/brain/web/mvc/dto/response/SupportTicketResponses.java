package brain.web.mvc.dto.response;

import brain.web.mvc.entity.SupportInquiry;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

public class SupportTicketResponses {

    @Builder
    public record SupportTicketData(
            String ticketId,
            String category,
            String subject,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            Boolean hasNewReply
    ) {
        public static SupportTicketData from(SupportInquiry inquiry) {
            return SupportTicketData.builder()
                    .ticketId(inquiry.getInquiryId())
                    .category(inquiry.getCategory())
                    .subject(inquiry.getTitle())
                    .status(toTicketStatus(inquiry.getStatus()))
                    .createdAt(inquiry.getCreatedAt())
                    .updatedAt(inquiry.getUpdatedAt())
                    .hasNewReply(false)
                    .build();
        }
    }

    public record SupportTicketListData(List<SupportTicketData> tickets) {
    }

    @Builder
    public record SupportMessageData(
            String messageId,
            String senderType,
            String content,
            List<SupportAttachmentData> attachments,
            LocalDateTime createdAt
    ) {
    }

    public record SupportAttachmentData(String assetId, String fileName, String fileUrl) {
    }

    @Builder
    public record SupportTicketDetailData(
            String ticketId,
            String category,
            String subject,
            String status,
            LocalDateTime createdAt,
            List<SupportMessageData> messages
    ) {
        public static SupportTicketDetailData from(SupportInquiry inquiry) {
            return SupportTicketDetailData.builder()
                    .ticketId(inquiry.getInquiryId())
                    .category(inquiry.getCategory())
                    .subject(inquiry.getTitle())
                    .status(toTicketStatus(inquiry.getStatus()))
                    .createdAt(inquiry.getCreatedAt())
                    .messages(List.of(SupportMessageData.builder()
                            .messageId(inquiry.getInquiryId() + "_msg_001")
                            .senderType("USER")
                            .content(inquiry.getContent())
                            .attachments(List.of())
                            .createdAt(inquiry.getCreatedAt())
                            .build()))
                    .build();
        }
    }

    private static String toTicketStatus(SupportInquiry.InquiryStatus status) {
        return switch (status) {
            case RECEIVED -> "OPEN";
            case IN_PROGRESS -> "IN_PROGRESS";
            case ANSWERED -> "RESOLVED";
            case CLOSED -> "CLOSED";
        };
    }
}
