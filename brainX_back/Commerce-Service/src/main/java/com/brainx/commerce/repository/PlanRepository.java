package com.brainx.commerce.repository;

import com.brainx.commerce.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlanRepository extends JpaRepository<Plan, String> {
    List<Plan> findByActiveTrueOrderByTierAsc();
}
