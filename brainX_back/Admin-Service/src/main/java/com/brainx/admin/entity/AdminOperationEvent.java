package com.brainx.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "admin_operation_events", indexes = {
        @Index(name = "idx_admin_operation_target", columnList = "targetType,targetId"),
        @Index(name = "idx_admin_operation_created", columnList = "createdAt")
})
public class AdminOperationEvent {
    @Id
    @Column(name = "event_id", length = 40)
    private String eventId;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(nullable = false, length = 40)
    private String targetType;

    @Column(nullable = false, length = 120)
    private String targetId;

    @Column(length = 40)
    private String adminUserId;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    protected AdminOperationEvent() {
    }

    public AdminOperationEvent(String action, String targetType, String targetId, String adminUserId, String detail) {
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.adminUserId = adminUserId;
        this.detail = detail;
    }

    @PrePersist
    void prePersist() {
        if (eventId == null) {
            eventId = "aoe_" + UUID.randomUUID().toString().replace("-", "");
        }
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public String getEventId() {
        return eventId;
    }

    public String getAction() {
        return action;
    }

    public String getTargetType() {
        return targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public String getAdminUserId() {
        return adminUserId;
    }

    public String getDetail() {
        return detail;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
