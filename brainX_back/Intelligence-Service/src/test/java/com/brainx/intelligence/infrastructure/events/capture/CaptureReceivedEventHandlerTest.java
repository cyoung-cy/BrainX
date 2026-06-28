package com.brainx.intelligence.infrastructure.events.capture;

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

class CaptureReceivedEventHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final FakeCaptureProjectionStore captureProjectionStore = new FakeCaptureProjectionStore();
    private final CaptureReceivedEventHandler handler = new CaptureReceivedEventHandler(objectMapper, captureProjectionStore);

    @Test
    void storesCaptureProjectionOnFirstEvent() {
        handler.handle(context("evt-1", """
            {
              "captureId": "capture-1",
              "userId": "user-1",
              "url": "https://example.com/post",
              "title": "Example post",
              "noteId": "note-1"
            }
            """));

        CaptureProjection projection = captureProjectionStore.findByCaptureId("capture-1").orElseThrow();
        assertThat(projection.userId()).isEqualTo("user-1");
        assertThat(projection.url()).isEqualTo("https://example.com/post");
        assertThat(projection.title()).isEqualTo("Example post");
        assertThat(projection.noteId()).isEqualTo("note-1");
        assertThat(projection.lastEventId()).isEqualTo("evt-1");
    }

    @Test
    void updatesExistingCaptureProjectionWhenLinkedNoteArrivesLater() {
        captureProjectionStore.save(CaptureProjection.received(
            "capture-1",
            "user-1",
            "https://example.com/post",
            "Example post",
            null,
            "evt-0",
            Instant.parse("2026-06-28T00:00:00Z")
        ));

        handler.handle(context("evt-2", """
            {
              "captureId": "capture-1",
              "userId": "user-1",
              "url": "https://example.com/post",
              "title": "Example post",
              "noteId": "note-1"
            }
            """));

        CaptureProjection projection = captureProjectionStore.findByCaptureId("capture-1").orElseThrow();
        assertThat(projection.noteId()).isEqualTo("note-1");
        assertThat(projection.lastEventId()).isEqualTo("evt-2");
    }

    private EventProcessingContext context(String eventId, String payloadJson) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", "CaptureReceived");
        envelope.put("eventVersion", 1);
        envelope.put("occurredAt", "2026-06-28T00:00:00Z");
        envelope.put("producer", "Ingestion-Service");
        envelope.put("tenantId", null);
        envelope.put("userId", "user-1");
        envelope.put("correlationId", eventId);
        envelope.put("causationId", null);
        envelope.put("idempotencyKey", "capture-1");
        try {
            envelope.put("payload", objectMapper.readTree(payloadJson));
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to parse test payload.", exception);
        }
        return new EventProcessingContext(objectMapper.convertValue(envelope, BrainxEventEnvelope.class));
    }

    private static final class FakeCaptureProjectionStore implements CaptureProjectionStore {

        private final Map<String, CaptureProjection> projections = new LinkedHashMap<>();

        @Override
        public Optional<CaptureProjection> findByCaptureId(String captureId) {
            return Optional.ofNullable(projections.get(captureId));
        }

        @Override
        public CaptureProjection save(CaptureProjection projection) {
            projections.put(projection.captureId(), projection);
            return projection;
        }
    }
}
