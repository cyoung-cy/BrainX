package com.brainx.intelligence.infrastructure.events.folder;

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
public class FolderEventHandler implements BrainxEventHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(FolderEventHandler.class);
    private static final Set<String> EVENT_TYPES = Set.of("FolderCreated", "FolderChanged", "FolderDeleted");

    private final ObjectMapper objectMapper;
    private final FolderProjectionStore folderProjectionStore;

    public FolderEventHandler(ObjectMapper objectMapper, FolderProjectionStore folderProjectionStore) {
        this.objectMapper = objectMapper;
        this.folderProjectionStore = folderProjectionStore;
    }

    @Override
    public Set<String> eventTypes() {
        return EVENT_TYPES;
    }

    @Override
    public void handle(EventProcessingContext context) {
        switch (context.eventType()) {
            case "FolderCreated" -> handleCreated(context);
            case "FolderChanged" -> handleChanged(context);
            case "FolderDeleted" -> handleDeleted(context);
            default -> throw EventProcessingException.nonRetryable("UNSUPPORTED_EVENT_TYPE", "Unsupported folder event type.");
        }
    }

    private void handleCreated(EventProcessingContext context) {
        FolderCreatedPayload payload = readPayload(context, FolderCreatedPayload.class);
        String folderId = requireText(payload.folderId(), "folderId");
        String userId = requireText(payload.userId(), "userId");
        String name = requireText(payload.name(), "name");
        String parentFolderId = normalizeOptionalText(payload.parentFolderId());

        var existing = folderProjectionStore.findByFolderId(folderId);
        if (existing.isPresent() && existing.get().sameFolder(name, parentFolderId, null, false, null, null)) {
            return;
        }

        FolderProjection projection = existing
            .filter(current -> !current.deleted())
            .map(current -> new FolderProjection(
                folderId,
                userId,
                name,
                parentFolderId,
                current.order(),
                false,
                null,
                null,
                context.eventId(),
                context.envelope().occurredAt()
            ))
            .orElseGet(() -> FolderProjection.created(
                folderId,
                userId,
                name,
                parentFolderId,
                context.eventId(),
                context.envelope().occurredAt()
            ));
        folderProjectionStore.save(projection);
        LOGGER.info("Folder created: folderId={}, userId={}", folderId, userId);
    }

    private void handleChanged(EventProcessingContext context) {
        FolderChangedPayload payload = readPayload(context, FolderChangedPayload.class);
        String folderId = requireText(payload.folderId(), "folderId");
        String userId = requireText(payload.userId(), "userId");
        String name = normalizeOptionalText(payload.name());
        String parentFolderId = normalizeOptionalText(payload.parentFolderId());
        Integer order = payload.order();

        FolderProjection current = folderProjectionStore.findByFolderId(folderId)
            .orElseGet(() -> new FolderProjection(folderId, userId, null, null, null, false, null, null, context.eventId(), context.envelope().occurredAt()));
        if (current.sameFolder(name == null ? current.name() : name, parentFolderId == null ? current.parentFolderId() : parentFolderId, order == null ? current.order() : order, current.deleted(), current.childNoteAction(), current.targetFolderId())) {
            return;
        }
        folderProjectionStore.save(current.withChanges(name, parentFolderId, order, context.eventId(), context.envelope().occurredAt()));
        LOGGER.info("Folder changed: folderId={}, userId={}", folderId, userId);
    }

    private void handleDeleted(EventProcessingContext context) {
        FolderDeletedPayload payload = readPayload(context, FolderDeletedPayload.class);
        String folderId = requireText(payload.folderId(), "folderId");
        String userId = requireText(payload.userId(), "userId");
        String childNoteAction = requireText(payload.childNoteAction(), "childNoteAction");
        String targetFolderId = normalizeOptionalText(payload.targetFolderId());

        var existing = folderProjectionStore.findByFolderId(folderId);
        if (existing.isPresent()
            && existing.get().sameFolder(existing.get().name(), existing.get().parentFolderId(), existing.get().order(), true, childNoteAction, targetFolderId)) {
            return;
        }

        FolderProjection projection = existing
            .map(current -> current.deleted(childNoteAction, targetFolderId, context.eventId(), context.envelope().occurredAt()))
            .orElseGet(() -> new FolderProjection(
                folderId,
                userId,
                null,
                null,
                null,
                true,
                childNoteAction,
                targetFolderId,
                context.eventId(),
                context.envelope().occurredAt()
            ));
        folderProjectionStore.save(projection);
        LOGGER.info("Folder deleted: folderId={}, userId={}", folderId, userId);
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
    record FolderCreatedPayload(
        String folderId,
        String userId,
        String name,
        String parentFolderId
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record FolderChangedPayload(
        String folderId,
        String userId,
        String name,
        String parentFolderId,
        Integer order
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record FolderDeletedPayload(
        String folderId,
        String userId,
        String childNoteAction,
        String targetFolderId
    ) {
    }
}
