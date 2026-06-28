package com.brainx.intelligence.infrastructure.events.link;

import java.time.Instant;

public record NoteLinkProjection(
    String linkId,
    String userId,
    String sourceNoteId,
    String targetNoteId,
    String linkType,
    boolean active,
    String lastEventId,
    Instant updatedAt
) {

    public NoteLinkProjection {
        linkId = requireText(linkId, "linkId");
        userId = requireText(userId, "userId");
        sourceNoteId = requireText(sourceNoteId, "sourceNoteId");
        targetNoteId = requireText(targetNoteId, "targetNoteId");
        linkType = normalizeOptionalText(linkType);
        lastEventId = requireText(lastEventId, "lastEventId");
        updatedAt = updatedAt == null ? Instant.EPOCH : updatedAt;
    }

    public static NoteLinkProjection created(
        String linkId,
        String userId,
        String sourceNoteId,
        String targetNoteId,
        String linkType,
        String eventId,
        Instant updatedAt
    ) {
        return new NoteLinkProjection(
            linkId,
            userId,
            sourceNoteId,
            targetNoteId,
            normalizeLinkType(linkType),
            true,
            eventId,
            updatedAt
        );
    }

    public boolean sameLink(String userId, String sourceNoteId, String targetNoteId, String linkType, boolean active) {
        return this.userId.equals(userId)
            && this.sourceNoteId.equals(sourceNoteId)
            && this.targetNoteId.equals(targetNoteId)
            && sameValue(this.linkType, normalizeOptionalText(normalizeLinkType(linkType)))
            && this.active == active;
    }

    public NoteLinkProjection deleted(String eventId, Instant updatedAt) {
        return new NoteLinkProjection(linkId, userId, sourceNoteId, targetNoteId, linkType, false, eventId, updatedAt);
    }

    private static String normalizeLinkType(String value) {
        if (value == null || value.isBlank()) {
            return "MANUAL";
        }
        return value.trim();
    }

    private static String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean sameValue(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank.");
        }
        return value.trim();
    }
}
