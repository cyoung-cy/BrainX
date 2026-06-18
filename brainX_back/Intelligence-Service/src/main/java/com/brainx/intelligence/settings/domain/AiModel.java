package com.brainx.intelligence.settings.domain;

import java.math.BigDecimal;

/**
 * 사용 가능한 AI 모델 catalog 항목입니다.
 */
public record AiModel(
    String modelId,
    String name,
    String provider,
    BigDecimal costPer1kTokens
) {

    public AiModel {
        modelId = SettingsValidation.requireText(modelId, "modelId");
        name = SettingsValidation.requireText(name, "name");
        provider = SettingsValidation.requireText(provider, "provider");
        if (costPer1kTokens != null && costPer1kTokens.signum() < 0) {
            throw new SettingsDomainException("costPer1kTokens must not be negative.");
        }
    }
}
