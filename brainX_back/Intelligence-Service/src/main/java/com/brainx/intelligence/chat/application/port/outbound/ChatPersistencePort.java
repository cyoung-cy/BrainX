package com.brainx.intelligence.chat.application.port.outbound;

import java.util.List;
import java.util.Optional;

import com.brainx.intelligence.chat.domain.ChatMessage;
import com.brainx.intelligence.chat.domain.ChatThread;

public interface ChatPersistencePort {

    ChatThread saveThread(ChatThread thread);

    Optional<ChatThread> findThreadByUserIdAndThreadId(String userId, String threadId);

    ChatMessage saveMessage(ChatMessage message);

    List<ChatMessage> findMessagesByUserIdAndThreadId(String userId, String threadId);
}
