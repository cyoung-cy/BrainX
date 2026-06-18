package com.brainx.intelligence.settings.domain;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * AI가 작성하거나 수정하는 결과물의 문체입니다.
 */
public record WritingStyle(
    Map<String, Object> values
) {

    public WritingStyle {
        values = immutableMap(values);
    }

    public static WritingStyle empty() {
        return new WritingStyle(Map.of());
    }

    private static Map<String, Object> immutableMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
