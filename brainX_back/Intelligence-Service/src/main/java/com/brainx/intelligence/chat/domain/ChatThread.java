package com.brainx.intelligence.chat.domain;

import java.time.Instant;

import com.brainx.intelligence.shared.domain.DocumentGroups;

public record ChatThread(
    String threadId,
    String userId,
    String documentGroupId,
    String title,
    String modelId,
    Instant createdAt
) {

    public ChatThread {
        threadId = requireText(threadId, "threadId");
        userId = requireText(userId, "userId");
        documentGroupId = DocumentGroups.normalize(documentGroupId);
        title = requireText(title, "title");
        modelId = requireText(modelId, "modelId");
        createdAt = createdAt == null ? Instant.now() : createdAt;
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new ChatDomainException(name + " must not be blank.");
        }
        return value.trim();
    }
}
