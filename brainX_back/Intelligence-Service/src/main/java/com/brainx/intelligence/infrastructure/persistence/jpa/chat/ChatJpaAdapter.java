package com.brainx.intelligence.infrastructure.persistence.jpa.chat;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.brainx.intelligence.chat.application.port.outbound.ChatPersistencePort;
import com.brainx.intelligence.chat.domain.ChatMessage;
import com.brainx.intelligence.chat.domain.ChatThread;

@Repository
public class ChatJpaAdapter implements ChatPersistencePort {

    private final ChatThreadJpaRepository chatThreadJpaRepository;
    private final ChatMessageJpaRepository chatMessageJpaRepository;

    public ChatJpaAdapter(
        ChatThreadJpaRepository chatThreadJpaRepository,
        ChatMessageJpaRepository chatMessageJpaRepository
    ) {
        this.chatThreadJpaRepository = chatThreadJpaRepository;
        this.chatMessageJpaRepository = chatMessageJpaRepository;
    }

    @Override
    public ChatThread saveThread(ChatThread thread) {
        return chatThreadJpaRepository.save(ChatThreadJpaEntity.fromDomain(thread))
            .toDomain();
    }

    @Override
    public Optional<ChatThread> findThreadByUserIdAndThreadId(String userId, String threadId) {
        return chatThreadJpaRepository.findByUserIdAndThreadId(userId, threadId)
            .map(ChatThreadJpaEntity::toDomain);
    }

    @Override
    public ChatMessage saveMessage(ChatMessage message) {
        return chatMessageJpaRepository.save(ChatMessageJpaEntity.fromDomain(message))
            .toDomain();
    }

    @Override
    public List<ChatMessage> findMessagesByUserIdAndThreadId(String userId, String threadId) {
        return chatMessageJpaRepository.findByUserIdAndThreadIdOrderByCreatedAtAsc(userId, threadId).stream()
            .map(ChatMessageJpaEntity::toDomain)
            .toList();
    }
}
