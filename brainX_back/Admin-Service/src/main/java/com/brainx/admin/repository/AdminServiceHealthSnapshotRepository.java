package com.brainx.admin.repository;

import com.brainx.admin.entity.AdminServiceHealthSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminServiceHealthSnapshotRepository extends JpaRepository<AdminServiceHealthSnapshot, String> {
    List<AdminServiceHealthSnapshot> findTop20ByOrderByCapturedAtDesc();
}
