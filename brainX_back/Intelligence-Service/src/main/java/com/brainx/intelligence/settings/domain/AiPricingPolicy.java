package com.brainx.intelligence.settings.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * BrainX 서비스의 AI 과금 안내와 정책 요약입니다.
 */
public record AiPricingPolicy(
    String billingUnit,
    String summary,
    Map<String, Object> details
) {

    public AiPricingPolicy {
        billingUnit = SettingsValidation.requireText(billingUnit, "billingUnit");
        summary = summary == null ? "" : summary;
        details = immutableMap(details);
    }

    public static AiPricingPolicy defaultTokenPolicy() {
        return new AiPricingPolicy("TOKEN", "", Map.of());
    }

    private static Map<String, Object> immutableMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
