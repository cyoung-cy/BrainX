package brain.web.mvc.exception;

import brain.web.mvc.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException exception, HttpServletRequest request) {
        return ResponseEntity
                .status(exception.getStatus())
                .body(ApiResponse.failure("REQUEST_FAILED", exception.getMessage(), traceId(request), Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(FieldError::getDefaultMessage)
                .orElse("요청 값이 올바르지 않습니다.");
        return ResponseEntity.badRequest()
                .body(ApiResponse.failure("VALIDATION_FAILED", message, traceId(request), Map.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception exception, HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("INTERNAL_ERROR", "서버 오류가 발생했습니다.", traceId(request), Map.of()));
    }

    private String traceId(HttpServletRequest request) {
        String header = request.getHeader("X-Request-Id");
        return header == null || header.isBlank() ? "trc_" + System.currentTimeMillis() : header;
    }
}
