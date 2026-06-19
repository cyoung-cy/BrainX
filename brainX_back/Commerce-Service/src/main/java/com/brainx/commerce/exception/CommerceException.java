package com.brainx.commerce.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Map;

@Getter
public class CommerceException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final Map<String, Object> details;

    public CommerceException(HttpStatus status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public CommerceException(HttpStatus status, String code, String message, Map<String, Object> details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    public static CommerceException badRequest(String code, String message) {
        return new CommerceException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static CommerceException notFound(String message) {
        return new CommerceException(HttpStatus.NOT_FOUND, "NOT_FOUND", message);
    }

    public static CommerceException conflict(String code, String message) {
        return new CommerceException(HttpStatus.CONFLICT, code, message);
    }

    public static CommerceException paymentFailed(String message) {
        return new CommerceException(HttpStatus.BAD_REQUEST, "PAYMENT_FAILED", message);
    }

    public static CommerceException paymentFailed(String code, String message) {
        return new CommerceException(HttpStatus.BAD_REQUEST, code, message);
    }
}
