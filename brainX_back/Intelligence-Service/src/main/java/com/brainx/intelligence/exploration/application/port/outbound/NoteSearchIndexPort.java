package com.brainx.intelligence.exploration.application.port.outbound;

import java.util.List;
import java.util.Map;

import com.brainx.intelligence.exploration.domain.NoteSearchDocument;
import com.brainx.intelligence.exploration.domain.SemanticSearchResult;

public interface NoteSearchIndexPort {

    List<SemanticSearchResult> search(NoteSearchQuery query);

    NoteSearchDocument save(NoteSearchDocument document);

    boolean replaceNoteChunks(String userId, String noteId, List<NoteSearchDocument> chunks);

    boolean deleteByUserIdAndNoteId(String userId, String noteId);

    record NoteSearchQuery(
        String userId,
        String queryText,
        Map<String, Object> filters,
        int limit,
        List<String> hybridWithClientKeywordIds
    ) {
    }
}
