package com.brainx.intelligence.infrastructure.persistence.jpa.deletion;

import java.time.Instant;

import com.brainx.intelligence.infrastructure.events.deletion.UserDeletionRequestProjection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "intelligence_user_deletion_requests")
public class UserDeletionRequestProjectionJpaEntity {

    @Id
    @Column(name = "user_id", nullable = false, length = 120)
    private String userId;

    @Column(name = "reason", length = 1024)
    private String reason;

    @Column(name = "deletion_scheduled_at", nullable = false)
    private Instant deletionScheduledAt;

    @Column(name = "last_event_id", nullable = false, length = 160)
    private String lastEventId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserDeletionRequestProjectionJpaEntity() {
    }

    static UserDeletionRequestProjectionJpaEntity fromDomain(UserDeletionRequestProjection projection) {
        UserDeletionRequestProjectionJpaEntity entity = new UserDeletionRequestProjectionJpaEntity();
        entity.userId = projection.userId();
        entity.reason = projection.reason();
        entity.deletionScheduledAt = projection.deletionScheduledAt();
        entity.lastEventId = projection.lastEventId();
        entity.updatedAt = projection.updatedAt();
        return entity;
    }

    UserDeletionRequestProjection toDomain() {
        return new UserDeletionRequestProjection(userId, reason, deletionScheduledAt, lastEventId, updatedAt);
    }
}
