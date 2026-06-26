package com.brainx.intelligence.infrastructure.events.note;

import java.time.Instant;

import com.brainx.intelligence.exploration.domain.NoteSearchDocument;
import com.brainx.intelligence.shared.domain.DocumentGroups;

public record NoteIndexChunkManifest(
    String userId,
    String documentGroupId,
    String noteId,
    String chunkId,
    int chunkIndex,
    String embeddingTextHash,
    String payloadHash,
    int chunkerVersion,
    Integer indexedVersion,
    String indexedMarkdownHash,
    Instant indexedAt
) {

    public NoteIndexChunkManifest {
        userId = requireText(userId, "userId");
        documentGroupId = DocumentGroups.normalize(documentGroupId);
        noteId = requireText(noteId, "noteId");
        chunkId = requireText(chunkId, "chunkId");
        if (chunkIndex < 0) {
            throw new IllegalArgumentException("chunkIndex must not be negative.");
        }
        embeddingTextHash = requireText(embeddingTextHash, "embeddingTextHash");
        payloadHash = requireText(payloadHash, "payloadHash");
        if (chunkerVersion <= 0) {
            throw new IllegalArgumentException("chunkerVersion must be positive.");
        }
        indexedAt = indexedAt == null ? Instant.EPOCH : indexedAt;
    }

    public static NoteIndexChunkManifest fromDocument(
        NoteSearchDocument document,
        int chunkerVersion,
        Integer indexedVersion,
        String indexedMarkdownHash,
        Instant indexedAt
    ) {
        return new NoteIndexChunkManifest(
            document.userId(),
            document.documentGroupId(),
            document.noteId(),
            document.chunkId(),
            document.chunkIndex(),
            NoteChunkIndexHasher.embeddingTextHash(document),
            NoteChunkIndexHasher.payloadHash(document),
            chunkerVersion,
            indexedVersion,
            indexedMarkdownHash,
            indexedAt
        );
    }

    private static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank.");
        }
        return value;
    }
}
