package com.brainx.intelligence.infrastructure.web;

/**
 * OpenAPI 공통 성공 응답 wrapper입니다.
 */
public record ApiSuccessResponse<T>(
    boolean success,
    String message,
    T data
) {

    public static <T> ApiSuccessResponse<T> ok(T data) {
        return new ApiSuccessResponse<>(true, "Success", data);
    }
}
