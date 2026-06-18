package brain.web.mvc.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.ALWAYS)
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final String message;
    private final ErrorBody error;

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .message(message)
                .error(null)
                .build();
    }

    public static <T> ApiResponse<T> failure(String message) {
        return failure("REQUEST_FAILED", message, null, Map.of());
    }

    public static <T> ApiResponse<T> failure(String code, String message, String traceId, Map<String, Object> details) {
        return ApiResponse.<T>builder()
                .success(false)
                .data(null)
                .message(message)
                .error(new ErrorBody(code, message, traceId, details == null ? Map.of() : details))
                .build();
    }

    public record ErrorBody(
            String code,
            String message,
            String traceId,
            Map<String, Object> details
    ) {
    }
}
