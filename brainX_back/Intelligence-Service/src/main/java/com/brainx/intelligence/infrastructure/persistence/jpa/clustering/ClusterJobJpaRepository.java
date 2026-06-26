package com.brainx.intelligence.infrastructure.persistence.jpa.clustering;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface ClusterJobJpaRepository extends JpaRepository<ClusterJobJpaEntity, String> {

    Optional<ClusterJobJpaEntity> findByUserIdAndClusterJobId(String userId, String clusterJobId);

    Optional<ClusterJobJpaEntity> findByUserIdAndIdempotencyKey(String userId, String idempotencyKey);
}
