package com.brainx.intelligence.infrastructure.web;

import java.util.Map;

/**
 * OpenAPI 공통 오류 응답 wrapper입니다.
 */
public record ApiErrorResponse(
    boolean success,
    Object data,
    String message,
    ErrorBody error
) {

    public static ApiErrorResponse of(String code, String message) {
        return new ApiErrorResponse(false, null, message, new ErrorBody(code, message, null, Map.of()));
    }

    public record ErrorBody(
        String code,
        String message,
        String traceId,
        Map<String, Object> details
    ) {
    }
}
