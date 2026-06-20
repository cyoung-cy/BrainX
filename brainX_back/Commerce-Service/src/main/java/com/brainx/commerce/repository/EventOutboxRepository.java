package com.brainx.commerce.repository;

import com.brainx.commerce.entity.EventOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventOutboxRepository extends JpaRepository<EventOutbox, String> {
}
