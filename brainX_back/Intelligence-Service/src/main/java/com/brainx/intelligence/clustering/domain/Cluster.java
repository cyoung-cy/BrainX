package com.brainx.intelligence.clustering.domain;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record Cluster(
    String clusterId,
    String title,
    String summary,
    List<String> noteIds,
    List<String> keywords,
    double confidence
) {

    public Cluster {
        clusterId = requireText(clusterId, "clusterId");
        title = title == null ? "" : title;
        summary = summary == null ? "" : summary;
        noteIds = noteIds == null ? List.of() : noteIds.stream()
            .filter(value -> value != null && !value.isBlank())
            .distinct()
            .toList();
        keywords = keywords == null ? List.of() : keywords.stream()
            .filter(value -> value != null && !value.isBlank())
            .distinct()
            .toList();
        confidence = Math.max(0.0d, Math.min(1.0d, confidence));
    }

    public Map<String, Object> toMap() {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("clusterId", clusterId);
        values.put("title", title);
        values.put("summary", summary);
        values.put("noteIds", noteIds);
        values.put("keywords", keywords);
        values.put("confidence", confidence);
        return values;
    }

    private static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank.");
        }
        return value.trim();
    }
}
