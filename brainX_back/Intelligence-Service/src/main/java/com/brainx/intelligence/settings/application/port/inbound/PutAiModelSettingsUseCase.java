package com.brainx.intelligence.settings.application.port.inbound;

import java.util.Map;

/**
 * 사용자 기본 AI 모델 설정을 저장합니다.
 */
public interface PutAiModelSettingsUseCase {

    AiModelSettingsResult putAiModelSettings(PutAiModelSettingsCommand command);

    record PutAiModelSettingsCommand(
        String userId,
        String defaultModelId,
        Map<String, Object> userApiKeys
    ) {
    }

    record AiModelSettingsResult(
        Map<String, Object> settings
    ) {
    }
}
