package com.brainx.intelligence.infrastructure.events.link;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.infrastructure.events.consumer.BrainxEventEnvelope;
import com.brainx.intelligence.infrastructure.events.consumer.EventProcessingContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class NoteLinkEventHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final FakeNoteLinkProjectionStore noteLinkProjectionStore = new FakeNoteLinkProjectionStore();
    private final NoteLinkEventHandler handler = new NoteLinkEventHandler(objectMapper, noteLinkProjectionStore);

    @Test
    void storesLinkProjectionOnCreateAndMarksInactiveOnDelete() {
        handler.handle(context("evt-1", "NoteLinkCreated", """
            {
              "linkId": "link-1",
              "userId": "user-1",
              "sourceNoteId": "note-a",
              "targetNoteId": "note-b",
              "linkType": "AI_SUGGESTED"
            }
            """));

        NoteLinkProjection created = noteLinkProjectionStore.findByLinkId("link-1").orElseThrow();
        assertThat(created.active()).isTrue();
        assertThat(created.linkType()).isEqualTo("AI_SUGGESTED");

        handler.handle(context("evt-2", "NoteLinkDeleted", """
            {
              "linkId": "link-1",
              "userId": "user-1",
              "sourceNoteId": "note-a",
              "targetNoteId": "note-b"
            }
            """));

        NoteLinkProjection deleted = noteLinkProjectionStore.findByLinkId("link-1").orElseThrow();
        assertThat(deleted.active()).isFalse();
        assertThat(deleted.lastEventId()).isEqualTo("evt-2");
    }

    @Test
    void ignoresDuplicateCreateWithSamePayload() {
        noteLinkProjectionStore.save(NoteLinkProjection.created(
            "link-1",
            "user-1",
            "note-a",
            "note-b",
            null,
            "evt-0",
            Instant.parse("2026-06-28T00:00:00Z")
        ));

        handler.handle(context("evt-1", "NoteLinkCreated", """
            {
              "linkId": "link-1",
              "userId": "user-1",
              "sourceNoteId": "note-a",
              "targetNoteId": "note-b"
            }
            """));

        NoteLinkProjection projection = noteLinkProjectionStore.findByLinkId("link-1").orElseThrow();
        assertThat(projection.lastEventId()).isEqualTo("evt-0");
    }

    private EventProcessingContext context(String eventId, String eventType, String payloadJson) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("eventVersion", 1);
        envelope.put("occurredAt", "2026-06-28T00:00:00Z");
        envelope.put("producer", "Workspace-Service");
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

    private static final class FakeNoteLinkProjectionStore implements NoteLinkProjectionStore {

        private final Map<String, NoteLinkProjection> projections = new LinkedHashMap<>();

        @Override
        public Optional<NoteLinkProjection> findByLinkId(String linkId) {
            return Optional.ofNullable(projections.get(linkId));
        }

        @Override
        public NoteLinkProjection save(NoteLinkProjection projection) {
            projections.put(projection.linkId(), projection);
            return projection;
        }
    }
}
