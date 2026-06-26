package com.brainx.intelligence.infrastructure.persistence.jpa.note;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

interface NoteIndexChunkManifestJpaRepository extends JpaRepository<NoteIndexChunkManifestJpaEntity, String> {

    List<NoteIndexChunkManifestJpaEntity> findByUserIdAndDocumentGroupIdAndNoteIdOrderByChunkIndexAsc(
        String userId,
        String documentGroupId,
        String noteId
    );

    void deleteByUserIdAndDocumentGroupIdAndNoteId(String userId, String documentGroupId, String noteId);
}
