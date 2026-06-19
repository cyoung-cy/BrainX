package com.brainx.intelligence.infrastructure.entitlement;

import org.springframework.stereotype.Component;

import com.brainx.intelligence.settings.application.port.outbound.AiModelAvailabilityPort;
import com.brainx.intelligence.settings.domain.AiModelAvailabilityPolicy;

/**
 * 외부 Commerce/Entitlement 연동을 통해 AI 모델 사용 가능 여부를 조회할 adapter 자리입니다.
 */
@Component
public class ExternalAiModelAvailabilityAdapter implements AiModelAvailabilityPort {

    @Override
    public AiModelAvailabilityPolicy resolveAvailability(AiModelAvailabilityQuery query) {
        return AiModelAvailabilityPolicy.none();
    }
}
