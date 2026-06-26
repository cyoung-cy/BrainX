package com.brainx.admin.repository;

import com.brainx.admin.entity.AdminMonitoringSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminMonitoringSnapshotRepository extends JpaRepository<AdminMonitoringSnapshot, String> {
    Optional<AdminMonitoringSnapshot> findTopByOrderByCapturedAtDesc();
}
