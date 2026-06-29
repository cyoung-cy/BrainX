package com.brainx.intelligence.infrastructure.events.deletion;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.infrastructure.events.consumer.BrainxEventEnvelope;
import com.brainx.intelligence.infrastructure.events.consumer.EventProcessingContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class UserDeletionRequestedEventHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final FakeUserDeletionRequestProjectionStore requestProjectionStore = new FakeUserDeletionRequestProjectionStore();
    private final UserDeletionRequestedEventHandler handler = new UserDeletionRequestedEventHandler(objectMapper, requestProjectionStore);

    @Test
    void storesDeletionRequestProjection() {
        handler.handle(context("evt-1", """
            {
              "userId": "user-1",
              "reason": "GDPR",
              "deletionScheduledAt": "2026-06-29T00:00:00Z"
            }
            """));

        UserDeletionRequestProjection projection = requestProjectionStore.findByUserId("user-1").orElseThrow();
        assertThat(projection.reason()).isEqualTo("GDPR");
        assertThat(projection.deletionScheduledAt()).isEqualTo(java.time.Instant.parse("2026-06-29T00:00:00Z"));
        assertThat(projection.lastEventId()).isEqualTo("evt-1");
    }

    private EventProcessingContext context(String eventId, String payloadJson) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", "UserDeletionRequested");
        envelope.put("eventVersion", 1);
        envelope.put("occurredAt", "2026-06-28T00:00:00Z");
        envelope.put("producer", "User-Service");
        envelope.put("tenantId", null);
        envelope.put("userId", "user-1");
        envelope.put("correlationId", eventId);
        envelope.put("causationId", null);
        envelope.put("idempotencyKey", eventId);
        try {
            envelope.put("payload", objectMapper.readTree(payloadJson));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse test payload.", exception);
        }
        return new EventProcessingContext(objectMapper.convertValue(envelope, BrainxEventEnvelope.class));
    }

    private static final class FakeUserDeletionRequestProjectionStore implements UserDeletionRequestProjectionStore {

        private final Map<String, UserDeletionRequestProjection> projections = new LinkedHashMap<>();

        @Override
        public Optional<UserDeletionRequestProjection> findByUserId(String userId) {
            return Optional.ofNullable(projections.get(userId));
        }

        @Override
        public UserDeletionRequestProjection save(UserDeletionRequestProjection projection) {
            projections.put(projection.userId(), projection);
            return projection;
        }
    }
}
