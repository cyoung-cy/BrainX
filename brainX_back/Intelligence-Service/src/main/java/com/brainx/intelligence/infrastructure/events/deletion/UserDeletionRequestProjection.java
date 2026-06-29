package com.brainx.intelligence.infrastructure.events.deletion;

import java.time.Instant;

public record UserDeletionRequestProjection(
    String userId,
    String reason,
    Instant deletionScheduledAt,
    String lastEventId,
    Instant updatedAt
) {

    public UserDeletionRequestProjection {
        userId = requireText(userId, "userId");
        reason = normalizeOptionalText(reason);
        deletionScheduledAt = deletionScheduledAt == null ? Instant.EPOCH : deletionScheduledAt;
        lastEventId = requireText(lastEventId, "lastEventId");
        updatedAt = updatedAt == null ? Instant.EPOCH : updatedAt;
    }

    public static UserDeletionRequestProjection requested(
        String userId,
        String reason,
        Instant deletionScheduledAt,
        String eventId,
        Instant updatedAt
    ) {
        return new UserDeletionRequestProjection(userId, reason, deletionScheduledAt, eventId, updatedAt);
    }

    public boolean sameRequest(String reason, Instant deletionScheduledAt) {
        return sameValue(this.reason, normalizeOptionalText(reason))
            && this.deletionScheduledAt.equals(deletionScheduledAt == null ? Instant.EPOCH : deletionScheduledAt);
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
