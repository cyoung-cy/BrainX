package com.brainx.intelligence.infrastructure.persistence.jpa.link;

import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.infrastructure.events.link.NoteLinkProjection;
import com.brainx.intelligence.infrastructure.events.link.NoteLinkProjectionStore;

@Repository
public class NoteLinkProjectionJpaAdapter implements NoteLinkProjectionStore {

    private final NoteLinkProjectionJpaRepository repository;

    public NoteLinkProjectionJpaAdapter(NoteLinkProjectionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<NoteLinkProjection> findByLinkId(String linkId) {
        return repository.findById(linkId).map(NoteLinkProjectionJpaEntity::toDomain);
    }

    @Override
    @Transactional
    public NoteLinkProjection save(NoteLinkProjection projection) {
        return repository.save(NoteLinkProjectionJpaEntity.fromDomain(projection)).toDomain();
    }
}
