package com.brainx.intelligence.connection.application.port.outbound;

public interface ConnectionEventPort {

    void linkSuggestionCreated(LinkSuggestionCreatedEvent event);

    void bridgeConceptCreated(BridgeConceptCreatedEvent event);

    record LinkSuggestionCreatedEvent(
        String userId,
        String suggestionId,
        String featureId,
        String noteId,
        String modelId
    ) {
    }

    record BridgeConceptCreatedEvent(
        String userId,
        String suggestionId,
        String featureId,
        String noteId,
        String modelId
    ) {
    }
}
