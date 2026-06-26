package com.brainx.intelligence.infrastructure.persistence.jpa.note;

import java.util.List;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.infrastructure.events.note.NoteChunkManifestStore;
import com.brainx.intelligence.infrastructure.events.note.NoteIndexChunkManifest;
import com.brainx.intelligence.shared.domain.DocumentGroups;

@Repository
public class NoteChunkManifestJpaAdapter implements NoteChunkManifestStore {

    private final NoteIndexChunkManifestJpaRepository repository;

    public NoteChunkManifestJpaAdapter(NoteIndexChunkManifestJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteIndexChunkManifest> findByUserIdAndDocumentGroupIdAndNoteId(
        String userId,
        String documentGroupId,
        String noteId
    ) {
        return repository.findByUserIdAndDocumentGroupIdAndNoteIdOrderByChunkIndexAsc(
                userId,
                DocumentGroups.normalize(documentGroupId),
                noteId
            )
            .stream()
            .map(NoteIndexChunkManifestJpaEntity::toDomain)
            .toList();
    }

    @Override
    @Transactional
    public void replaceForNote(
        String userId,
        String documentGroupId,
        String noteId,
        List<NoteIndexChunkManifest> manifests
    ) {
        String normalizedDocumentGroupId = DocumentGroups.normalize(documentGroupId);
        repository.deleteByUserIdAndDocumentGroupIdAndNoteId(userId, normalizedDocumentGroupId, noteId);
        if (manifests == null || manifests.isEmpty()) {
            return;
        }
        repository.saveAll(manifests.stream()
            .map(NoteIndexChunkManifestJpaEntity::fromDomain)
            .toList());
    }

    @Override
    @Transactional
    public void deleteByUserIdAndDocumentGroupIdAndNoteId(String userId, String documentGroupId, String noteId) {
        repository.deleteByUserIdAndDocumentGroupIdAndNoteId(
            userId,
            DocumentGroups.normalize(documentGroupId),
            noteId
        );
    }
}
