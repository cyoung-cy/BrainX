package com.brainx.intelligence.infrastructure.persistence.jpa.chat;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface ChatThreadJpaRepository extends JpaRepository<ChatThreadJpaEntity, String> {

    Optional<ChatThreadJpaEntity> findByUserIdAndThreadId(String userId, String threadId);
}
