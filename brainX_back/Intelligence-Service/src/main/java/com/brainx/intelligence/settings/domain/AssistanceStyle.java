package com.brainx.intelligence.settings.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AI가 사용자와 함께 일하고 도움을 제공하는 방식입니다.
 */
public record AssistanceStyle(
    Map<String, Object> values
) {

    public AssistanceStyle {
        values = immutableMap(values);
    }

    public static AssistanceStyle empty() {
        return new AssistanceStyle(Map.of());
    }

    private static Map<String, Object> immutableMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
