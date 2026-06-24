package com.brainx.intelligence.chat.application.port.inbound;

import java.time.Instant;

public interface CreateChatThreadUseCase {

    ChatThreadResult createChatThread(CreateChatThreadCommand command);

    record CreateChatThreadCommand(
        String userId,
        String documentGroupId,
        String title,
        String modelId
    ) {
    }

    record ChatThreadResult(
        String threadId,
        String documentGroupId,
        String title,
        String modelId,
        Instant createdAt
    ) {
    }
}
