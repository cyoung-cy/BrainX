package com.brainx.intelligence.exploration.application.port.outbound;

import java.util.List;
import java.util.Map;

import com.brainx.intelligence.exploration.domain.NoteSearchDocument;
import com.brainx.intelligence.exploration.domain.SearchScope;
import com.brainx.intelligence.exploration.domain.SemanticSearchResult;
import com.brainx.intelligence.shared.domain.DocumentGroups;

public interface NoteSearchIndexPort {

    List<SemanticSearchResult> search(NoteSearchQuery query);

    NoteSearchDocument save(NoteSearchDocument document);

    boolean replaceNoteChunks(String userId, String documentGroupId, String noteId, List<NoteSearchDocument> chunks);

    boolean deleteByUserIdAndDocumentGroupIdAndNoteId(String userId, String documentGroupId, String noteId);

    record NoteSearchQuery(
        String userId,
        SearchScope scope,
        String documentGroupId,
        String queryText,
        Map<String, Object> filters,
        int limit,
        List<String> hybridWithClientKeywordIds
    ) {
        public NoteSearchQuery(
            String userId,
            String documentGroupId,
            String queryText,
            Map<String, Object> filters,
            int limit,
            List<String> hybridWithClientKeywordIds
        ) {
            this(userId, SearchScope.DOCUMENT_GROUP, documentGroupId, queryText, filters, limit, hybridWithClientKeywordIds);
        }

        public NoteSearchQuery(
            String userId,
            String queryText,
            Map<String, Object> filters,
            int limit,
            List<String> hybridWithClientKeywordIds
        ) {
            this(userId, SearchScope.DOCUMENT_GROUP, DocumentGroups.DEFAULT_DOCUMENT_GROUP_ID, queryText, filters, limit, hybridWithClientKeywordIds);
        }

        public NoteSearchQuery {
            scope = scope == null ? SearchScope.DOCUMENT_GROUP : scope;
            documentGroupId = scope == SearchScope.USER ? null : DocumentGroups.normalize(documentGroupId);
        }
    }
}
