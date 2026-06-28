package com.brainx.intelligence.infrastructure.events.capture;

import java.time.Instant;

public record CaptureProjection(
    String captureId,
    String userId,
    String url,
    String title,
    String noteId,
    String lastEventId,
    Instant updatedAt
) {

    public CaptureProjection {
        captureId = requireText(captureId, "captureId");
        userId = requireText(userId, "userId");
        url = requireText(url, "url");
        title = requireText(title, "title");
        noteId = normalizeOptionalText(noteId);
        lastEventId = requireText(lastEventId, "lastEventId");
        updatedAt = updatedAt == null ? Instant.EPOCH : updatedAt;
    }

    public static CaptureProjection received(
        String captureId,
        String userId,
        String url,
        String title,
        String noteId,
        String eventId,
        Instant updatedAt
    ) {
        return new CaptureProjection(captureId, userId, url, title, noteId, eventId, updatedAt);
    }

    public boolean sameCapture(String userId, String url, String title, String noteId) {
        return this.userId.equals(userId)
            && this.url.equals(url)
            && this.title.equals(title)
            && sameValue(this.noteId, normalizeOptionalText(noteId));
    }

    public CaptureProjection withLink(String noteId, String eventId, Instant updatedAt) {
        return new CaptureProjection(captureId, userId, url, title, noteId, eventId, updatedAt);
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank.");
        }
        return value;
    }

    private static String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private static boolean sameValue(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }
}
