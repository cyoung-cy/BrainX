package brain.web.mvc.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportInquiryRequest(
        @NotBlank(message = "문의 유형은 필수입니다")
        @Size(max = 40, message = "문의 유형은 40자 이하여야 합니다")
        String category,

        @NotBlank(message = "제목은 필수입니다")
        @Size(max = 120, message = "제목은 120자 이하여야 합니다")
        String title,

        @NotBlank(message = "내용은 필수입니다")
        @Size(max = 10000, message = "내용은 10000자 이하여야 합니다")
        String content
) {
}
