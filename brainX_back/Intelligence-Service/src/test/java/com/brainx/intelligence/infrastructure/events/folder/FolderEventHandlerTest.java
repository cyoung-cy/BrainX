package com.brainx.intelligence.infrastructure.events.folder;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.infrastructure.events.consumer.BrainxEventEnvelope;
import com.brainx.intelligence.infrastructure.events.consumer.EventProcessingContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class FolderEventHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final FakeFolderProjectionStore folderProjectionStore = new FakeFolderProjectionStore();
    private final FolderEventHandler handler = new FolderEventHandler(objectMapper, folderProjectionStore);

    @Test
    void storesFolderProjectionAndTracksDeletionState() {
        handler.handle(context("evt-1", "FolderCreated", """
            {
              "folderId": "folder-1",
              "userId": "user-1",
              "name": "Projects",
              "parentFolderId": "folder-root"
            }
            """));

        FolderProjection created = folderProjectionStore.findByFolderId("folder-1").orElseThrow();
        assertThat(created.name()).isEqualTo("Projects");
        assertThat(created.deleted()).isFalse();

        handler.handle(context("evt-2", "FolderChanged", """
            {
              "folderId": "folder-1",
              "userId": "user-1",
              "name": "Projects 2026",
              "order": 7
            }
            """));

        FolderProjection changed = folderProjectionStore.findByFolderId("folder-1").orElseThrow();
        assertThat(changed.name()).isEqualTo("Projects 2026");
        assertThat(changed.order()).isEqualTo(7);

        handler.handle(context("evt-3", "FolderDeleted", """
            {
              "folderId": "folder-1",
              "userId": "user-1",
              "childNoteAction": "MOVE",
              "targetFolderId": "folder-archive"
            }
            """));

        FolderProjection deleted = folderProjectionStore.findByFolderId("folder-1").orElseThrow();
        assertThat(deleted.deleted()).isTrue();
        assertThat(deleted.childNoteAction()).isEqualTo("MOVE");
        assertThat(deleted.targetFolderId()).isEqualTo("folder-archive");
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

    private static final class FakeFolderProjectionStore implements FolderProjectionStore {

        private final Map<String, FolderProjection> projections = new LinkedHashMap<>();

        @Override
        public Optional<FolderProjection> findByFolderId(String folderId) {
            return Optional.ofNullable(projections.get(folderId));
        }

        @Override
        public FolderProjection save(FolderProjection projection) {
            projections.put(projection.folderId(), projection);
            return projection;
        }
    }
}
