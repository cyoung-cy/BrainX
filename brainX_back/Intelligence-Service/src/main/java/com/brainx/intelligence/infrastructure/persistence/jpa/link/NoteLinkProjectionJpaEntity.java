package com.brainx.intelligence.infrastructure.persistence.jpa.link;

import java.time.Instant;

import com.brainx.intelligence.infrastructure.events.link.NoteLinkProjection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "intelligence_note_link_projections")
public class NoteLinkProjectionJpaEntity {

    @Id
    @Column(name = "link_id", nullable = false, length = 160)
    private String linkId;

    @Column(name = "user_id", nullable = false, length = 120)
    private String userId;

    @Column(name = "source_note_id", nullable = false, length = 120)
    private String sourceNoteId;

    @Column(name = "target_note_id", nullable = false, length = 120)
    private String targetNoteId;

    @Column(name = "link_type", length = 64)
    private String linkType;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "last_event_id", nullable = false, length = 160)
    private String lastEventId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected NoteLinkProjectionJpaEntity() {
    }

    static NoteLinkProjectionJpaEntity fromDomain(NoteLinkProjection projection) {
        NoteLinkProjectionJpaEntity entity = new NoteLinkProjectionJpaEntity();
        entity.linkId = projection.linkId();
        entity.userId = projection.userId();
        entity.sourceNoteId = projection.sourceNoteId();
        entity.targetNoteId = projection.targetNoteId();
        entity.linkType = projection.linkType();
        entity.active = projection.active();
        entity.lastEventId = projection.lastEventId();
        entity.updatedAt = projection.updatedAt();
        return entity;
    }

    NoteLinkProjection toDomain() {
        return new NoteLinkProjection(linkId, userId, sourceNoteId, targetNoteId, linkType, active, lastEventId, updatedAt);
    }

    String linkId() {
        return linkId;
    }

    void setLinkId(String linkId) {
        this.linkId = linkId;
    }
}
