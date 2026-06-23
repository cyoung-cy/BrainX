package com.brainx.intelligence.chat.domain;

import java.util.LinkedHashMap;
import java.util.Map;

public record ChatCitation(
    String noteId,
    String documentGroupId,
    String chunkId,
    int chunkIndex,
    String title,
    String sourcePath,
    String sourceFilename,
    double score
) {

    public Map<String, Object> toMap() {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("noteId", noteId);
        values.put("documentGroupId", documentGroupId);
        values.put("chunkId", chunkId);
        values.put("chunkIndex", chunkIndex);
        values.put("title", title);
        values.put("sourcePath", sourcePath);
        values.put("sourceFilename", sourceFilename);
        values.put("score", score);
        return values;
    }
}
