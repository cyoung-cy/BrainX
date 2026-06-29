package com.brainx.intelligence.infrastructure.persistence.jpa.capture;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.infrastructure.events.capture.CaptureProjection;
import com.brainx.intelligence.infrastructure.events.capture.CaptureProjectionStore;

@Repository
public class CaptureProjectionJpaAdapter implements CaptureProjectionStore {

    private final CaptureProjectionJpaRepository repository;
    @Autowired
    public CaptureProjectionJpaAdapter(CaptureProjectionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<CaptureProjection> findByCaptureId(String captureId) {
        return repository.findById(captureId).map(CaptureProjectionJpaEntity::toDomain);
    }

    @Override
    @Transactional
    public CaptureProjection save(CaptureProjection projection) {
        return repository.save(CaptureProjectionJpaEntity.fromDomain(projection)).toDomain();
    }
}
