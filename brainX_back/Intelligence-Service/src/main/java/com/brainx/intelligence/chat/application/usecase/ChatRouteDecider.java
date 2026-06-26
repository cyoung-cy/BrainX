package com.brainx.intelligence.chat.application.usecase;

import java.util.Map;

import com.brainx.intelligence.chat.domain.ChatRouteDecision;

public interface ChatRouteDecider {

    ChatRouteDecision decide(ChatRouteRequest request);

    record ChatRouteRequest(
        String userId,
        String message,
        String documentGroupId,
        Map<String, Object> noteScope,
        Map<String, Object> clientContext
    ) {
    }
}
