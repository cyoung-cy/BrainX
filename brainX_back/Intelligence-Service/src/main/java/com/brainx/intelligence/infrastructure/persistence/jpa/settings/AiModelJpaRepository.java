package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AiModelJpaRepository extends JpaRepository<AiModelJpaEntity, String> {
}
