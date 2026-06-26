package com.brainx.intelligence.infrastructure.persistence.jpa.insight;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface InsightReportJpaRepository extends JpaRepository<InsightReportJpaEntity, String> {

    Optional<InsightReportJpaEntity> findByUserIdAndReportId(String userId, String reportId);

    Optional<InsightReportJpaEntity> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);
}
