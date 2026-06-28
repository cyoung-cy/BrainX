package com.brainx.intelligence.infrastructure.persistence.jpa.deletion;

import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.infrastructure.events.deletion.UserDeletionRequestProjection;
import com.brainx.intelligence.infrastructure.events.deletion.UserDeletionRequestProjectionStore;

@Repository
public class UserDeletionRequestProjectionJpaAdapter implements UserDeletionRequestProjectionStore {

    private final UserDeletionRequestProjectionJpaRepository repository;

    public UserDeletionRequestProjectionJpaAdapter(UserDeletionRequestProjectionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserDeletionRequestProjection> findByUserId(String userId) {
        return repository.findById(userId).map(UserDeletionRequestProjectionJpaEntity::toDomain);
    }

    @Override
    @Transactional
    public UserDeletionRequestProjection save(UserDeletionRequestProjection projection) {
        return repository.save(UserDeletionRequestProjectionJpaEntity.fromDomain(projection)).toDomain();
    }
}
