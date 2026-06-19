package com.brainx.intelligence.settings.domain;

/**
 * 사용 가능한 AI 모델 catalog 항목입니다.
 */
public record AiModel(
    String modelId,
    String name,
    String provider,
    VendorTokenCost vendorTokenCost
) {

    public AiModel {
        modelId = SettingsValidation.requireText(modelId, "modelId");
        name = SettingsValidation.requireText(name, "name");
        provider = SettingsValidation.requireText(provider, "provider");
        vendorTokenCost = vendorTokenCost == null ? VendorTokenCost.unknown() : vendorTokenCost;
    }
}
