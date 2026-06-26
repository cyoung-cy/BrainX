package com.brainx.intelligence.infrastructure.persistence.jpa.insight;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.brainx.intelligence.insight.application.port.outbound.InsightReportStore;
import com.brainx.intelligence.insight.domain.InsightReport;
import com.fasterxml.jackson.databind.ObjectMapper;

@Repository
public class InsightReportJpaAdapter implements InsightReportStore {

    private final InsightReportJpaRepository repository;
    private final ObjectMapper objectMapper;

    public InsightReportJpaAdapter(InsightReportJpaRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Override
    public InsightReport save(InsightReport report) {
        return repository.save(InsightReportJpaEntity.fromDomain(report, objectMapper))
            .toDomain(objectMapper);
    }

    @Override
    public Optional<InsightReport> findByUserIdAndReportId(String userId, String reportId) {
        return repository.findByUserIdAndReportId(userId, reportId)
            .map(entity -> entity.toDomain(objectMapper));
    }

    @Override
    public Optional<InsightReport> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey) {
        return repository.findByUserIdAndIdempotencyKey(userId, idempotencyKey)
            .map(entity -> entity.toDomain(objectMapper));
    }
}
