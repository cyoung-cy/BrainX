package com.brainx.intelligence.connection.application.port.inbound;

import java.util.List;

public interface CreateBridgeConceptsUseCase {

    BridgeConceptsResult createBridgeConcepts(BridgeConceptsCommand command);

    record BridgeConceptsCommand(
        String userId,
        List<String> noteIds
    ) {
    }

    record BridgeConceptsResult(
        List<BridgeConceptRecommendation> recommendations
    ) {
        public BridgeConceptsResult {
            recommendations = recommendations == null ? List.of() : List.copyOf(recommendations);
        }
    }

    record BridgeConceptRecommendation(
        String noteId,
        String title,
        String bridgeReason
    ) {
    }
}
