package com.brainx.intelligence.infrastructure.events.note;

import java.util.List;

public interface NoteChunkManifestStore {

    List<NoteIndexChunkManifest> findByUserIdAndDocumentGroupIdAndNoteId(
        String userId,
        String documentGroupId,
        String noteId
    );

    void replaceForNote(
        String userId,
        String documentGroupId,
        String noteId,
        List<NoteIndexChunkManifest> manifests
    );

    void deleteByUserIdAndDocumentGroupIdAndNoteId(String userId, String documentGroupId, String noteId);
}
