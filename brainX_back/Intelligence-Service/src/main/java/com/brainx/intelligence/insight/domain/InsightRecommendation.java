package com.brainx.intelligence.insight.domain;

import java.util.List;

public record InsightRecommendation(
    String type,
    String title,
    String reason,
    List<String> noteIds,
    String priority
) {

    public InsightRecommendation {
        type = normalize(type, "GENERAL");
        title = normalize(title, "");
        reason = normalize(reason, "");
        noteIds = noteIds == null ? List.of() : noteIds.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .distinct()
            .toList();
        priority = normalize(priority, "MEDIUM");
    }

    private static String normalize(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
