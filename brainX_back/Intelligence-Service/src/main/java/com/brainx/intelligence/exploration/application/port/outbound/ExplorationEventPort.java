package com.brainx.intelligence.exploration.application.port.outbound;

import com.brainx.intelligence.exploration.domain.SearchScope;
import com.brainx.intelligence.shared.domain.DocumentGroups;

public interface ExplorationEventPort {

    void semanticSearchPerformed(SemanticSearchPerformedEvent event);

    record SemanticSearchPerformedEvent(
        String userId,
        SearchScope scope,
        String documentGroupId,
        String queryHash,
        int resultCount,
        boolean charged
    ) {
        public SemanticSearchPerformedEvent(
            String userId,
            String documentGroupId,
            String queryHash,
            int resultCount,
            boolean charged
        ) {
            this(userId, SearchScope.DOCUMENT_GROUP, documentGroupId, queryHash, resultCount, charged);
        }

        public SemanticSearchPerformedEvent(
            String userId,
            String queryHash,
            int resultCount,
            boolean charged
        ) {
            this(userId, SearchScope.DOCUMENT_GROUP, null, queryHash, resultCount, charged);
        }

        public SemanticSearchPerformedEvent {
            scope = scope == null ? SearchScope.DOCUMENT_GROUP : scope;
            documentGroupId = scope == SearchScope.USER ? null : DocumentGroups.normalize(documentGroupId);
        }
    }
}
