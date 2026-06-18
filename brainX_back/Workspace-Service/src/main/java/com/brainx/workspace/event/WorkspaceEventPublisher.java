package com.brainx.workspace.event;

import com.brainx.workspace.entity.EventOutbox;
import com.brainx.workspace.repository.EventOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WorkspaceEventPublisher {
    private static final String PRODUCER = "Workspace-Service";
    private final EventOutboxRepository outboxRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final ObjectMapper objectMapper;

    public void publish(String eventType, String userId, Map<String, Object> payload) {
        Instant now = Instant.now();
        String eventId = "evt_" + UUID.randomUUID();
        String correlationId = stringValue(payload, "correlationId");
        if (correlationId == null) {
            correlationId = "req_" + UUID.randomUUID();
        }
        String causationId = stringValue(payload, "causationId");
        String idempotencyKey = stringValue(payload, "idempotencyKey");
        WorkspaceEvent event = new WorkspaceEvent(
                eventId,
                eventType,
                1,
                now,
                PRODUCER,
                null,
                userId,
                correlationId,
                causationId,
                idempotencyKey,
                channel(eventType),
                payload
        );
        outboxRepository.save(new EventOutbox(
                event.eventId(),
                event.eventType(),
                event.eventVersion(),
                event.occurredAt(),
                event.producer(),
                event.tenantId(),
                event.userId(),
                event.correlationId(),
                event.causationId(),
                event.idempotencyKey(),
                event.channel(),
                toJson(event.payload())
        ));
        applicationEventPublisher.publishEvent(event);
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize event payload.", exception);
        }
    }

    private String stringValue(Map<String, Object> payload, String key) {
        Object value = payload == null ? null : payload.get(key);
        return value instanceof String text && !text.isBlank() ? text : null;
    }

    private String channel(String eventType) {
        return switch (eventType) {
            case "NoteCreated" -> "brainx.knowledge.workspace.note-created.v1";
            case "NoteContentSaved" -> "brainx.knowledge.workspace.note-content-saved.v1";
            case "NoteMetadataChanged" -> "brainx.knowledge.workspace.note-metadata-changed.v1";
            case "NoteTrashed" -> "brainx.knowledge.workspace.note-trashed.v1";
            case "NoteDeleted" -> "brainx.knowledge.workspace.note-deleted.v1";
            case "NoteViewed" -> "brainx.knowledge.workspace.note-viewed.v1";
            case "FolderCreated" -> "brainx.knowledge.workspace.folder-created.v1";
            case "FolderChanged" -> "brainx.knowledge.workspace.folder-changed.v1";
            case "FolderDeleted" -> "brainx.knowledge.workspace.folder-deleted.v1";
            case "NotesMoved" -> "brainx.knowledge.workspace.notes-moved.v1";
            case "NoteTagsChanged" -> "brainx.knowledge.workspace.note-tags-changed.v1";
            case "FavoriteChanged" -> "brainx.knowledge.workspace.favorite-changed.v1";
            case "NoteLinkCreated" -> "brainx.knowledge.workspace.note-link-created.v1";
            case "NoteLinkDeleted" -> "brainx.knowledge.workspace.note-link-deleted.v1";
            case "GraphLayoutSaved" -> "brainx.knowledge.workspace.graph-layout-saved.v1";
            case "ShareLinkCreated" -> "brainx.knowledge.workspace.share-link-created.v1";
            case "ShareLinkChanged" -> "brainx.knowledge.workspace.share-link-changed.v1";
            default -> "brainx.knowledge.workspace.unknown.v1";
        };
    }
}
