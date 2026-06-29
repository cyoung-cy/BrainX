package com.brainx.intelligence.infrastructure.events.capture;

import java.time.Instant;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.brainx.intelligence.infrastructure.events.consumer.BrainxEventHandler;
import com.brainx.intelligence.infrastructure.events.consumer.EventProcessingContext;
import com.brainx.intelligence.infrastructure.events.consumer.EventProcessingException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class CaptureReceivedEventHandler implements BrainxEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(CaptureReceivedEventHandler.class);
    private static final Set<String> EVENT_TYPES = Set.of("CaptureReceived");

    private final ObjectMapper objectMapper;
    private final CaptureProjectionStore captureProjectionStore;

    public CaptureReceivedEventHandler(ObjectMapper objectMapper, CaptureProjectionStore captureProjectionStore) {
        this.objectMapper = objectMapper;
        this.captureProjectionStore = captureProjectionStore;
    }

    @Override
    public Set<String> eventTypes() {
        return EVENT_TYPES;
    }

    @Override
    public void handle(EventProcessingContext context) {
        CaptureReceivedPayload payload = readPayload(context, CaptureReceivedPayload.class);
        String captureId = requireText(payload.captureId(), "captureId");
        String userId = requireText(payload.userId(), "userId");
        String url = requireText(payload.url(), "url");
        String title = requireText(payload.title(), "title");
        String noteId = normalizeOptionalText(payload.noteId());

        var existing = captureProjectionStore.findByCaptureId(captureId);
        if (existing.isPresent() && existing.get().sameCapture(userId, url, title, noteId)) {
            return;
        }

        CaptureProjection projection = existing
            .map(current -> current.withLink(noteId, context.eventId(), context.envelope().occurredAt()))
            .orElseGet(() -> CaptureProjection.received(
                captureId,
                userId,
                url,
                title,
                noteId,
                context.eventId(),
                context.envelope().occurredAt()
            ));
        captureProjectionStore.save(projection);
        LOGGER.info("Capture received: captureId={}, userId={}, noteId={}", captureId, userId, noteId);
    }

    private <T> T readPayload(EventProcessingContext context, Class<T> payloadType) {
        try {
            return objectMapper.treeToValue(context.payload(), payloadType);
        } catch (JsonProcessingException exception) {
            throw EventProcessingException.nonRetryable(
                "INVALID_PAYLOAD",
                "Event payload does not match " + payloadType.getSimpleName()
            );
        }
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw EventProcessingException.nonRetryable("INVALID_PAYLOAD", name + " must not be blank.");
        }
        return value;
    }

    private static String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record CaptureReceivedPayload(
        String captureId,
        String userId,
        String url,
        String title,
        String noteId
    ) {
    }
}
