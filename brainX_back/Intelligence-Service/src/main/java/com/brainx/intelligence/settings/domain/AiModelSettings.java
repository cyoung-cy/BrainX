package com.brainx.intelligence.settings.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 사용자별 AI 모델 설정입니다.
 */
public record AiModelSettings(
    String userId,
    String defaultModelId,
    Map<String, Object> userApiKeys
) {

    public AiModelSettings {
        userId = SettingsValidation.requireText(userId, "userId");
        defaultModelId = SettingsValidation.requireText(defaultModelId, "defaultModelId");
        userApiKeys = immutableMap(userApiKeys);
    }

    private static Map<String, Object> immutableMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
