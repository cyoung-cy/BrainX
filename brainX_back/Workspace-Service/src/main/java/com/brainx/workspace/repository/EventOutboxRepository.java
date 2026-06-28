package com.brainx.workspace.repository;

import com.brainx.workspace.entity.EventOutbox;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventOutboxRepository extends JpaRepository<EventOutbox, String> {
    List<EventOutbox> findTop50ByPublishedAtIsNullOrderByOccurredAtAsc();
}
