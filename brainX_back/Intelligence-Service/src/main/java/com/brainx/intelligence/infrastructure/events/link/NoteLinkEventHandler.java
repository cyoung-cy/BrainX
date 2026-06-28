package com.brainx.intelligence.infrastructure.events.link;

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
public class NoteLinkEventHandler implements BrainxEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(NoteLinkEventHandler.class);
    private static final Set<String> EVENT_TYPES = Set.of("NoteLinkCreated", "NoteLinkDeleted");

    private final ObjectMapper objectMapper;
    private final NoteLinkProjectionStore noteLinkProjectionStore;

    public NoteLinkEventHandler(ObjectMapper objectMapper, NoteLinkProjectionStore noteLinkProjectionStore) {
        this.objectMapper = objectMapper;
        this.noteLinkProjectionStore = noteLinkProjectionStore;
    }

    @Override
    public Set<String> eventTypes() {
        return EVENT_TYPES;
    }

    @Override
    public void handle(EventProcessingContext context) {
        switch (context.eventType()) {
            case "NoteLinkCreated" -> handleCreated(context);
            case "NoteLinkDeleted" -> handleDeleted(context);
            default -> throw EventProcessingException.nonRetryable("UNSUPPORTED_EVENT_TYPE", "Unsupported note link event type.");
        }
    }

    private void handleCreated(EventProcessingContext context) {
        NoteLinkCreatedPayload payload = readPayload(context, NoteLinkCreatedPayload.class);
        String linkId = requireText(payload.linkId(), "linkId");
        String userId = requireText(payload.userId(), "userId");
        String sourceNoteId = requireText(payload.sourceNoteId(), "sourceNoteId");
        String targetNoteId = requireText(payload.targetNoteId(), "targetNoteId");
        String linkType = normalizeOptionalText(payload.linkType());

        var existing = noteLinkProjectionStore.findByLinkId(linkId);
        if (existing.isPresent() && existing.get().sameLink(userId, sourceNoteId, targetNoteId, linkType, true)) {
            return;
        }

        NoteLinkProjection projection = existing
            .filter(current -> current.active())
            .map(current -> new NoteLinkProjection(
                linkId,
                userId,
                sourceNoteId,
                targetNoteId,
                linkType == null ? current.linkType() : linkType,
                true,
                context.eventId(),
                context.envelope().occurredAt()
            ))
            .orElseGet(() -> NoteLinkProjection.created(
                linkId,
                userId,
                sourceNoteId,
                targetNoteId,
                linkType,
                context.eventId(),
                context.envelope().occurredAt()
            ));
        noteLinkProjectionStore.save(projection);
        LOGGER.info("Note link created: linkId={}, userId={}, sourceNoteId={}, targetNoteId={}", linkId, userId, sourceNoteId, targetNoteId);
    }

    private void handleDeleted(EventProcessingContext context) {
        NoteLinkDeletedPayload payload = readPayload(context, NoteLinkDeletedPayload.class);
        String linkId = requireText(payload.linkId(), "linkId");
        String userId = requireText(payload.userId(), "userId");
        String sourceNoteId = requireText(payload.sourceNoteId(), "sourceNoteId");
        String targetNoteId = requireText(payload.targetNoteId(), "targetNoteId");

        var existing = noteLinkProjectionStore.findByLinkId(linkId);
        if (existing.isPresent()
            && !existing.get().active()
            && existing.get().sameLink(userId, sourceNoteId, targetNoteId, existing.get().linkType(), false)) {
            return;
        }

        NoteLinkProjection projection = existing
            .map(current -> new NoteLinkProjection(
                linkId,
                userId,
                sourceNoteId,
                targetNoteId,
                current.linkType(),
                false,
                context.eventId(),
                context.envelope().occurredAt()
            ))
            .orElseGet(() -> new NoteLinkProjection(
                linkId,
                userId,
                sourceNoteId,
                targetNoteId,
                null,
                false,
                context.eventId(),
                context.envelope().occurredAt()
            ));
        noteLinkProjectionStore.save(projection);
        LOGGER.info("Note link deleted: linkId={}, userId={}, sourceNoteId={}, targetNoteId={}", linkId, userId, sourceNoteId, targetNoteId);
    }

    private <T> T readPayload(EventProcessingContext context, Class<T> payloadType) {
        try {
            return objectMapper.treeToValue(context.payload(), payloadType);
        } catch (JsonProcessingException exception) {
            throw EventProcessingException.nonRetryable("INVALID_PAYLOAD", "Event payload does not match " + payloadType.getSimpleName());
        }
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw EventProcessingException.nonRetryable("INVALID_PAYLOAD", name + " must not be blank.");
        }
        return value.trim();
    }

    private static String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record NoteLinkCreatedPayload(
        String linkId,
        String userId,
        String sourceNoteId,
        String targetNoteId,
        String linkType,
        String anchorText,
        String headingAnchor
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record NoteLinkDeletedPayload(
        String linkId,
        String userId,
        String sourceNoteId,
        String targetNoteId
    ) {
    }
}
