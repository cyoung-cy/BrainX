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
@Table(name = "admin_service_health_snapshots", indexes = @Index(name = "idx_admin_service_health_service", columnList = "serviceName"))
public class AdminServiceHealthSnapshot {
    @Id
    @Column(name = "health_snapshot_id", length = 40)
    private String healthSnapshotId;

    @Column(nullable = false, length = 80)
    private String serviceName;

    @Column(nullable = false, length = 20)
    private String state;

    @Column(nullable = false)
    private long latencyMs;

    @Column(nullable = false)
    private double uptimePercent;

    @Column(nullable = false)
    private OffsetDateTime capturedAt;

    protected AdminServiceHealthSnapshot() {
    }

    public AdminServiceHealthSnapshot(String serviceName, String state, long latencyMs, double uptimePercent, OffsetDateTime capturedAt) {
        this.serviceName = serviceName;
        this.state = state;
        this.latencyMs = latencyMs;
        this.uptimePercent = uptimePercent;
        this.capturedAt = capturedAt;
    }

    @PrePersist
    void prePersist() {
        if (healthSnapshotId == null) {
            healthSnapshotId = "ash_" + UUID.randomUUID().toString().replace("-", "");
        }
        if (capturedAt == null) {
            capturedAt = OffsetDateTime.now();
        }
    }

    public String getHealthSnapshotId() {
        return healthSnapshotId;
    }

    public String getServiceName() {
        return serviceName;
    }

    public String getState() {
        return state;
    }

    public long getLatencyMs() {
        return latencyMs;
    }

    public double getUptimePercent() {
        return uptimePercent;
    }

    public OffsetDateTime getCapturedAt() {
        return capturedAt;
    }
}
