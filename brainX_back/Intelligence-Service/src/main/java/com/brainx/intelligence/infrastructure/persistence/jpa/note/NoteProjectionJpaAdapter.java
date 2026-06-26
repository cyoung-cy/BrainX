package com.brainx.intelligence.infrastructure.persistence.jpa.note;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.autolink.application.port.outbound.AutoLinkNoteSourcePort;
import com.brainx.intelligence.autolink.application.port.outbound.AutoLinkNoteSourcePort.AutoLinkNoteSource;
import com.brainx.intelligence.connection.application.port.outbound.ConnectionNoteSourcePort;
import com.brainx.intelligence.connection.application.port.outbound.ConnectionNoteSourcePort.ConnectionBridgeSourceNote;
import com.brainx.intelligence.connection.application.port.outbound.ConnectionNoteSourcePort.ConnectionNoteSource;
import com.brainx.intelligence.infrastructure.events.note.NoteProjection;
import com.brainx.intelligence.infrastructure.events.note.NoteProjectionStore;
import com.brainx.intelligence.infrastructure.events.note.NoteSearchIndexStatus;
import com.brainx.intelligence.shared.domain.DocumentGroups;

@Repository
public class NoteProjectionJpaAdapter implements NoteProjectionStore, AutoLinkNoteSourcePort, ConnectionNoteSourcePort {

    private final NoteProjectionJpaRepository repository;

    public NoteProjectionJpaAdapter(NoteProjectionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<NoteProjection> findByUserIdAndDocumentGroupIdAndNoteId(
        String userId,
        String documentGroupId,
        String noteId
    ) {
        return repository.findByUserIdAndDocumentGroupIdAndNoteId(
                userId,
                DocumentGroups.normalize(documentGroupId),
                noteId
            )
            .map(NoteProjectionJpaEntity::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteProjection> findByUserIdAndDocumentGroupIdAndNoteIds(
        String userId,
        String documentGroupId,
        List<String> noteIds
    ) {
        if (noteIds == null || noteIds.isEmpty()) {
            return List.of();
        }
        return repository.findByUserIdAndDocumentGroupIdAndNoteIdIn(
                userId,
                DocumentGroups.normalize(documentGroupId),
                noteIds
            ).stream()
            .map(NoteProjectionJpaEntity::toDomain)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteProjection> findSearchableByUserIdAndDocumentGroupId(
        String userId,
        String documentGroupId,
        int limit
    ) {
        if (limit <= 0) {
            return List.of();
        }
        return repository.findSearchable(
                userId,
                DocumentGroups.normalize(documentGroupId),
                NoteSearchIndexStatus.INDEXED,
                PageRequest.of(0, limit)
            ).stream()
            .map(NoteProjectionJpaEntity::toDomain)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AutoLinkNoteSource> findSearchableNoteSources(String userId, String documentGroupId, int limit) {
        return findSearchableByUserIdAndDocumentGroupId(userId, documentGroupId, limit).stream()
            .map(projection -> new AutoLinkNoteSource(
                projection.userId(),
                projection.documentGroupId(),
                projection.noteId(),
                projection.title(),
                projection.tags(),
                projection.markdownHash(),
                projection.markdown(),
                projection.updatedAt()
            ))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ConnectionNoteSource> findLinkSuggestionSourceNote(
        String userId,
        String documentGroupId,
        String noteId
    ) {
        return findByUserIdAndDocumentGroupIdAndNoteId(userId, documentGroupId, noteId)
            .filter(NoteProjectionJpaAdapter::canCreateLinkSuggestions)
            .map(projection -> new ConnectionNoteSource(
                projection.userId(),
                projection.documentGroupId(),
                projection.noteId(),
                projection.title()
            ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConnectionBridgeSourceNote> findBridgeSourceNotes(
        String userId,
        String documentGroupId,
        List<String> noteIds
    ) {
        if (noteIds == null || noteIds.isEmpty()) {
            return List.of();
        }
        Map<String, NoteProjection> projectionsById = findByUserIdAndDocumentGroupIdAndNoteIds(
                userId,
                documentGroupId,
                noteIds
            ).stream()
            .filter(NoteProjection::searchable)
            .collect(Collectors.toMap(
                NoteProjection::noteId,
                Function.identity(),
                (left, right) -> left
            ));
        return noteIds.stream()
            .distinct()
            .map(projectionsById::get)
            .filter(projection -> projection != null)
            .map(projection -> new ConnectionBridgeSourceNote(
                projection.userId(),
                projection.documentGroupId(),
                projection.noteId(),
                projection.title(),
                projection.tags()
            ))
            .toList();
    }

    @Override
    @Transactional
    public NoteProjection save(NoteProjection projection) {
        NoteProjectionJpaEntity entity = NoteProjectionJpaEntity.fromDomain(projection);
        repository.findByUserIdAndDocumentGroupIdAndNoteId(
                projection.userId(),
                projection.documentGroupId(),
                projection.noteId()
            )
            .map(NoteProjectionJpaEntity::projectionId)
            .ifPresent(entity::setProjectionId);
        return repository.save(entity).toDomain();
    }

    private static boolean canCreateLinkSuggestions(NoteProjection projection) {
        return projection.searchable()
            && !projection.contentPending()
            && projection.markdown() != null
            && projection.searchIndexStatus() == NoteSearchIndexStatus.INDEXED;
    }
}
