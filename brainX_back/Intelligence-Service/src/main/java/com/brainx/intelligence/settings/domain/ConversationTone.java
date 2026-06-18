package com.brainx.intelligence.settings.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AI가 사용자에게 직접 말할 때의 어투입니다.
 */
public record ConversationTone(
    Map<String, Object> values
) {

    public ConversationTone {
        values = immutableMap(values);
    }

    public static ConversationTone empty() {
        return new ConversationTone(Map.of());
    }

    private static Map<String, Object> immutableMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
