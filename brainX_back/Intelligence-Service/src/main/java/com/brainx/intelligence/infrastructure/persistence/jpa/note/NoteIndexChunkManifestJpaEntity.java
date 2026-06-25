package com.brainx.intelligence.infrastructure.persistence.jpa.note;

import java.time.Instant;

import com.brainx.intelligence.infrastructure.events.note.NoteIndexChunkManifest;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "intelligence_note_index_chunks")
public class NoteIndexChunkManifestJpaEntity {

    @Id
    @Column(name = "manifest_id", nullable = false, length = 620)
    private String manifestId;

    @Column(name = "user_id", nullable = false, length = 120)
    private String userId;

    @Column(name = "document_group_id", nullable = false, length = 120)
    private String documentGroupId;

    @Column(name = "note_id", nullable = false, length = 120)
    private String noteId;

    @Column(name = "chunk_id", nullable = false, length = 260)
    private String chunkId;

    @Column(name = "chunk_index", nullable = false)
    private int chunkIndex;

    @Column(name = "embedding_text_hash", nullable = false, length = 64)
    private String embeddingTextHash;

    @Column(name = "payload_hash", nullable = false, length = 64)
    private String payloadHash;

    @Column(name = "chunker_version", nullable = false)
    private int chunkerVersion;

    @Column(name = "indexed_version")
    private Integer indexedVersion;

    @Column(name = "indexed_markdown_hash", length = 160)
    private String indexedMarkdownHash;

    @Column(name = "indexed_at", nullable = false)
    private Instant indexedAt;

    protected NoteIndexChunkManifestJpaEntity() {
    }

    static NoteIndexChunkManifestJpaEntity fromDomain(NoteIndexChunkManifest manifest) {
        NoteIndexChunkManifestJpaEntity entity = new NoteIndexChunkManifestJpaEntity();
        entity.manifestId = manifestId(
            manifest.userId(),
            manifest.documentGroupId(),
            manifest.noteId(),
            manifest.chunkId()
        );
        entity.userId = manifest.userId();
        entity.documentGroupId = manifest.documentGroupId();
        entity.noteId = manifest.noteId();
        entity.chunkId = manifest.chunkId();
        entity.chunkIndex = manifest.chunkIndex();
        entity.embeddingTextHash = manifest.embeddingTextHash();
        entity.payloadHash = manifest.payloadHash();
        entity.chunkerVersion = manifest.chunkerVersion();
        entity.indexedVersion = manifest.indexedVersion();
        entity.indexedMarkdownHash = manifest.indexedMarkdownHash();
        entity.indexedAt = manifest.indexedAt();
        return entity;
    }

    NoteIndexChunkManifest toDomain() {
        return new NoteIndexChunkManifest(
            userId,
            documentGroupId,
            noteId,
            chunkId,
            chunkIndex,
            embeddingTextHash,
            payloadHash,
            chunkerVersion,
            indexedVersion,
            indexedMarkdownHash,
            indexedAt
        );
    }

    private static String manifestId(String userId, String documentGroupId, String noteId, String chunkId) {
        return userId + "::" + documentGroupId + "::" + noteId + "::" + chunkId;
    }
}
