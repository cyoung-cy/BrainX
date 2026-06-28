package com.brainx.commerce.repository;

import com.brainx.commerce.entity.EventOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventOutboxRepository extends JpaRepository<EventOutbox, String> {
    List<EventOutbox> findTop50ByPublishedAtIsNullOrderByOccurredAtAsc();
}
