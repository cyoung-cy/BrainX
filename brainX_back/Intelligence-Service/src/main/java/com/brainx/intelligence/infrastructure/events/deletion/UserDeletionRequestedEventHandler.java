package com.brainx.intelligence.infrastructure.events.deletion;

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
public class UserDeletionRequestedEventHandler implements BrainxEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(UserDeletionRequestedEventHandler.class);
    private static final Set<String> EVENT_TYPES = Set.of("UserDeletionRequested");

    private final ObjectMapper objectMapper;
    private final UserDeletionRequestProjectionStore requestProjectionStore;

    public UserDeletionRequestedEventHandler(
        ObjectMapper objectMapper,
        UserDeletionRequestProjectionStore requestProjectionStore
    ) {
        this.objectMapper = objectMapper;
        this.requestProjectionStore = requestProjectionStore;
    }

    @Override
    public Set<String> eventTypes() {
        return EVENT_TYPES;
    }

    @Override
    public void handle(EventProcessingContext context) {
        UserDeletionRequestedPayload payload = readPayload(context, UserDeletionRequestedPayload.class);
        String userId = requireText(payload.userId(), "userId");
        Instant deletionScheduledAt = requireInstant(payload.deletionScheduledAt(), "deletionScheduledAt");
        String reason = normalizeOptionalText(payload.reason());

        var existing = requestProjectionStore.findByUserId(userId);
        if (existing.isPresent() && existing.get().sameRequest(reason, deletionScheduledAt)) {
            return;
        }

        UserDeletionRequestProjection projection = UserDeletionRequestProjection.requested(
            userId,
            reason,
            deletionScheduledAt,
            context.eventId(),
            context.envelope().occurredAt()
        );
        requestProjectionStore.save(projection);
        LOGGER.info("User deletion requested: userId={}, scheduledAt={}", userId, deletionScheduledAt);
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

    private static Instant requireInstant(Instant value, String name) {
        if (value == null) {
            throw EventProcessingException.nonRetryable("INVALID_PAYLOAD", name + " must be present.");
        }
        return value;
    }

    private static String normalizeOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record UserDeletionRequestedPayload(
        String userId,
        String reason,
        Instant deletionScheduledAt
    ) {
    }
}
