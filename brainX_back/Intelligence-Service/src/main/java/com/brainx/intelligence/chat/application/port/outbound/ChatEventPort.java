package com.brainx.intelligence.chat.application.port.outbound;

import java.util.List;

public interface ChatEventPort {

    void chatThreadCreated(ChatThreadCreatedEvent event);

    void chatMessageCreated(ChatMessageCreatedEvent event);

    record ChatThreadCreatedEvent(
        String userId,
        String threadId,
        String documentGroupId,
        String modelId,
        String title
    ) {
    }

    record ChatMessageCreatedEvent(
        String userId,
        String threadId,
        String messageId,
        String documentGroupId,
        String modelId,
        int inputTokens,
        int outputTokens,
        List<String> citationNoteIds
    ) {
        public ChatMessageCreatedEvent {
            citationNoteIds = citationNoteIds == null ? List.of() : List.copyOf(citationNoteIds);
        }
    }
}
