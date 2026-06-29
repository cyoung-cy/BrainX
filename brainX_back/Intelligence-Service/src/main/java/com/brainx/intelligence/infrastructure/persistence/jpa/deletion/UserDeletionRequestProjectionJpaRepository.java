package com.brainx.intelligence.infrastructure.persistence.jpa.deletion;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserDeletionRequestProjectionJpaRepository extends JpaRepository<UserDeletionRequestProjectionJpaEntity, String> {
}
