package com.brainx.intelligence.settings.domain;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 사용자 문체 프로필입니다.
 */
public record StyleProfile(
    String userId,
    Map<String, Object> style,
    Instant detectedFromNotesAt
) {

    public StyleProfile {
        userId = SettingsValidation.requireText(userId, "userId");
        style = immutableMap(style);
    }

    public static StyleProfile empty(String userId) {
        return new StyleProfile(userId, Map.of(), null);
    }

    private static Map<String, Object> immutableMap(Map<String, Object> values) {
        if (values == null || values.isEmpty()) {
            return Map.of();
        }
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
}
