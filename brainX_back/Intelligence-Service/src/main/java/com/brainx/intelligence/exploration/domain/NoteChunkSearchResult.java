package com.brainx.intelligence.exploration.domain;

public record NoteChunkSearchResult(
    String userId,
    String noteId,
    String chunkId,
    int chunkIndex,
    String title,
    String text,
    double score,
    String markdownHash,
    Integer version,
    String sourcePath,
    String sourceFilename
) {

    public NoteChunkSearchResult(
        String userId,
        String noteId,
        String chunkId,
        int chunkIndex,
        String title,
        String text,
        double score,
        String markdownHash,
        Integer version
    ) {
        this(userId, noteId, chunkId, chunkIndex, title, text, score, markdownHash, version, null, null);
    }

    public NoteChunkSearchResult {
        userId = userId == null ? "" : userId;
        noteId = ExplorationValidation.requireText(noteId, "noteId");
        chunkId = ExplorationValidation.requireText(chunkId, "chunkId");
        if (chunkIndex < 0) {
            throw new ExplorationDomainException("chunkIndex must not be negative.");
        }
        title = title == null ? "" : title;
        text = text == null ? "" : text;
        sourcePath = normalizeOptionalText(sourcePath);
        sourceFilename = normalizeOptionalText(sourceFilename);
    }

    private static String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
