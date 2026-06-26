package com.brainx.intelligence.shared.application.port.outbound;

import java.time.Instant;
import java.util.List;

import com.brainx.intelligence.shared.domain.DocumentGroups;

public interface KnowledgeAnalysisNoteSourcePort {

    List<KnowledgeAnalysisNote> findAnalysisNotes(String userId, String documentGroupId, int limit);

    List<KnowledgeAnalysisNote> findAnalysisNotesByIds(String userId, String documentGroupId, List<String> noteIds);

    record KnowledgeAnalysisNote(
        String userId,
        String documentGroupId,
        String noteId,
        String title,
        List<String> tags,
        List<String> headings,
        String excerpt,
        Instant updatedAt
    ) {
        public KnowledgeAnalysisNote {
            documentGroupId = DocumentGroups.normalize(documentGroupId);
            title = title == null ? "" : title;
            tags = tags == null ? List.of() : List.copyOf(tags);
            headings = headings == null ? List.of() : List.copyOf(headings);
            excerpt = excerpt == null ? "" : excerpt;
            updatedAt = updatedAt == null ? Instant.EPOCH : updatedAt;
        }
    }
}
