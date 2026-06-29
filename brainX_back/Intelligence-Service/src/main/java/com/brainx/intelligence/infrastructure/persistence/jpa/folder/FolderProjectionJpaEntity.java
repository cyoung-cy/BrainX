package com.brainx.intelligence.infrastructure.persistence.jpa.folder;

import java.time.Instant;

import com.brainx.intelligence.infrastructure.events.folder.FolderProjection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "intelligence_folder_projections")
public class FolderProjectionJpaEntity {

    @Id
    @Column(name = "folder_id", nullable = false, length = 160)
    private String folderId;

    @Column(name = "user_id", nullable = false, length = 120)
    private String userId;

    @Column(name = "name", length = 512)
    private String name;

    @Column(name = "parent_folder_id", length = 160)
    private String parentFolderId;

    @Column(name = "folder_order")
    private Integer order;

    @Column(name = "deleted", nullable = false)
    private boolean deleted;

    @Column(name = "child_note_action", length = 32)
    private String childNoteAction;

    @Column(name = "target_folder_id", length = 160)
    private String targetFolderId;

    @Column(name = "last_event_id", nullable = false, length = 160)
    private String lastEventId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected FolderProjectionJpaEntity() {
    }

    static FolderProjectionJpaEntity fromDomain(FolderProjection projection) {
        FolderProjectionJpaEntity entity = new FolderProjectionJpaEntity();
        entity.folderId = projection.folderId();
        entity.userId = projection.userId();
        entity.name = projection.name();
        entity.parentFolderId = projection.parentFolderId();
        entity.order = projection.order();
        entity.deleted = projection.deleted();
        entity.childNoteAction = projection.childNoteAction();
        entity.targetFolderId = projection.targetFolderId();
        entity.lastEventId = projection.lastEventId();
        entity.updatedAt = projection.updatedAt();
        return entity;
    }

    FolderProjection toDomain() {
        return new FolderProjection(folderId, userId, name, parentFolderId, order, deleted, childNoteAction, targetFolderId, lastEventId, updatedAt);
    }
}
