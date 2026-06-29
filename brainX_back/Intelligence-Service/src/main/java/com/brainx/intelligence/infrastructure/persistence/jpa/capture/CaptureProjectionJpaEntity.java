package com.brainx.intelligence.infrastructure.persistence.jpa.capture;

import java.time.Instant;

import com.brainx.intelligence.infrastructure.events.capture.CaptureProjection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "intelligence_capture_projections")
public class CaptureProjectionJpaEntity {

    @Id
    @Column(name = "capture_id", nullable = false, length = 160)
    private String captureId;

    @Column(name = "user_id", nullable = false, length = 120)
    private String userId;

    @Column(name = "url", nullable = false, length = 1024)
    private String url;

    @Column(name = "title", nullable = false, length = 512)
    private String title;

    @Column(name = "note_id", length = 120)
    private String noteId;

    @Column(name = "last_event_id", nullable = false, length = 160)
    private String lastEventId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CaptureProjectionJpaEntity() {
    }

    static CaptureProjectionJpaEntity fromDomain(CaptureProjection projection) {
        CaptureProjectionJpaEntity entity = new CaptureProjectionJpaEntity();
        entity.captureId = projection.captureId();
        entity.userId = projection.userId();
        entity.url = projection.url();
        entity.title = projection.title();
        entity.noteId = projection.noteId();
        entity.lastEventId = projection.lastEventId();
        entity.updatedAt = projection.updatedAt();
        return entity;
    }

    CaptureProjection toDomain() {
        return new CaptureProjection(captureId, userId, url, title, noteId, lastEventId, updatedAt);
    }

    String captureId() {
        return captureId;
    }

    void setCaptureId(String captureId) {
        this.captureId = captureId;
    }
}
