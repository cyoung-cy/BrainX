package com.brainx.intelligence.shared.application.port.outbound;

/**
 * 토큰 사용 기록 요청을 외부 사용량 집계 흐름으로 전달하기 위한 출력 포트입니다.
 */
public interface TokenUsagePort {

    void recordTokenUsage(TokenUsageRecord record);

    record TokenUsageRecord(
        String userId,
        String feature,
        String modelId,
        int promptTokens,
        int completionTokens,
        int totalTokens,
        String correlationId
    ) {
    }
}
