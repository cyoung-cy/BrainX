package com.brainx.intelligence.connection.application.port.outbound;

import java.util.List;
import java.util.Optional;

public interface ConnectionNoteSourcePort {

    Optional<ConnectionNoteSource> findLinkSuggestionSourceNote(String userId, String documentGroupId, String noteId);

    List<ConnectionBridgeSourceNote> findBridgeSourceNotes(String userId, String documentGroupId, List<String> noteIds);

    record ConnectionNoteSource(
        String userId,
        String documentGroupId,
        String noteId,
        String title
    ) {
    }

    record ConnectionBridgeSourceNote(
        String userId,
        String documentGroupId,
        String noteId,
        String title,
        List<String> tags
    ) {
        public ConnectionBridgeSourceNote {
            title = title == null ? "" : title;
            tags = tags == null ? List.of() : List.copyOf(tags);
        }
    }
}
