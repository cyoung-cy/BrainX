package brain.web.mvc.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SupportTicketCreateRequest(
        @NotBlank(message = "문의 유형은 필수입니다.")
        @Pattern(regexp = "ACCOUNT|BILLING|PAYMENT|BUG|FEATURE_REQUEST|DATA|OTHER", message = "지원하지 않는 문의 유형입니다.")
        @Size(max = 40, message = "문의 유형은 40자 이하여야 합니다.")
        String category,

        @NotBlank(message = "제목은 필수입니다.")
        @Size(max = 120, message = "제목은 120자 이하여야 합니다.")
        String subject,

        @NotBlank(message = "내용은 필수입니다.")
        @Size(max = 10000, message = "내용은 10000자 이하여야 합니다.")
        String body,

        List<String> attachments
) {
}
