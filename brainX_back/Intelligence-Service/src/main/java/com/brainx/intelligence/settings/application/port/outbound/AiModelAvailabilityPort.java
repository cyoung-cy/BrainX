package com.brainx.intelligence.settings.application.port.outbound;

import java.util.List;

import com.brainx.intelligence.settings.domain.AiModelAvailabilityPolicy;

/**
 * 외부 권한/플랜 도메인에 AI 모델 사용 가능 여부를 질의합니다.
 */
public interface AiModelAvailabilityPort {

    AiModelAvailabilityPolicy resolveAvailability(AiModelAvailabilityQuery query);

    record AiModelAvailabilityQuery(
        String userId,
        List<String> catalogModelIds
    ) {
    }
}
