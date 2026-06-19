package com.brainx.commerce.event;

import java.time.Instant;
import java.util.Map;

public record CommerceEvent(
        String eventId,
        String eventType,
        int eventVersion,
        Instant occurredAt,
        String producer,
        String tenantId,
        String userId,
        String correlationId,
        String causationId,
        String idempotencyKey,
        String channel,
        Map<String, Object> payload
) {
}
