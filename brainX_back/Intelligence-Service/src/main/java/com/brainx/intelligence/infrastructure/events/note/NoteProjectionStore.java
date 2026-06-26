package com.brainx.intelligence.infrastructure.events.note;

import java.util.List;
import java.util.Optional;

public interface NoteProjectionStore {

    Optional<NoteProjection> findByUserIdAndDocumentGroupIdAndNoteId(
        String userId,
        String documentGroupId,
        String noteId
    );

    List<NoteProjection> findByUserIdAndDocumentGroupIdAndNoteIds(
        String userId,
        String documentGroupId,
        List<String> noteIds
    );

    List<NoteProjection> findSearchableByUserIdAndDocumentGroupId(
        String userId,
        String documentGroupId,
        int limit
    );

    NoteProjection save(NoteProjection projection);
}
