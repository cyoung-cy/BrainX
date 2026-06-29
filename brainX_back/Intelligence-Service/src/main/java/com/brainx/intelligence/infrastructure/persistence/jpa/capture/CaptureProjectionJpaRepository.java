package com.brainx.intelligence.infrastructure.persistence.jpa.capture;

import org.springframework.data.jpa.repository.JpaRepository;

interface CaptureProjectionJpaRepository extends JpaRepository<CaptureProjectionJpaEntity, String> {
}
