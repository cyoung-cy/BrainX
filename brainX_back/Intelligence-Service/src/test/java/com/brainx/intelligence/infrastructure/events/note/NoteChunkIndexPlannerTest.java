package com.brainx.intelligence.infrastructure.events.note;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.exploration.domain.NoteSearchDocument;

class NoteChunkIndexPlannerTest {

    private final NoteChunkIndexPlanner planner = new NoteChunkIndexPlanner();
    private final Instant indexedAt = Instant.parse("2026-06-25T00:00:00Z");

    @Test
    void plansDeltaForUnchangedNewRemovedAndPayloadOnlyChunks() {
        List<NoteSearchDocument> previousChunks = List.of(
            doc("a", 0, "same-a", "hash-1", 1, List.of()),
            doc("b", 1, "same-b", "hash-1", 1, List.of()),
            doc("c", 2, "same-c", "hash-1", 1, List.of()),
            doc("d", 3, "removed", "hash-1", 1, List.of())
        );
        List<NoteIndexChunkManifest> previous = manifests(previousChunks, "hash-1", 1);
        List<NoteSearchDocument> next = List.of(
            doc("a", 0, "same-a", "hash-2", 2, List.of("tag-1")),
            doc("b", 1, "same-b", "hash-2", 2, List.of()),
            doc("c", 2, "same-c", "hash-2", 2, List.of()),
            doc("e", 3, "new", "hash-2", 2, List.of())
        );

        NoteChunkIndexPlan plan = planner.plan(
            previous,
            next,
            MarkdownNoteChunker.CHUNKER_VERSION,
            2,
            "hash-2",
            indexedAt,
            false
        );

        assertThat(plan.fullReplace()).isFalse();
        assertThat(plan.delta().upsertChunks()).extracting(NoteSearchDocument::chunkId).containsExactly("e");
        assertThat(plan.delta().deleteChunkIds()).containsExactly("d");
        assertThat(plan.delta().payloadOnlyChunks()).extracting(NoteSearchDocument::chunkId)
            .containsExactly("a", "b", "c");
        assertThat(plan.manifests()).hasSize(4);
    }

    @Test
    void fallsBackToFullReplaceWhenChangedRatioIsTooHigh() {
        List<NoteIndexChunkManifest> previous = manifests(List.of(
            doc("a", 0, "old-a", "hash-1", 1, List.of()),
            doc("b", 1, "old-b", "hash-1", 1, List.of())
        ), "hash-1", 1);
        List<NoteSearchDocument> next = List.of(
            doc("x", 0, "new-x", "hash-2", 2, List.of()),
            doc("y", 1, "new-y", "hash-2", 2, List.of())
        );

        NoteChunkIndexPlan plan = planner.plan(
            previous,
            next,
            MarkdownNoteChunker.CHUNKER_VERSION,
            2,
            "hash-2",
            indexedAt,
            false
        );

        assertThat(plan.fullReplace()).isTrue();
        assertThat(plan.delta().upsertChunks()).extracting(NoteSearchDocument::chunkId)
            .containsExactly("x", "y");
        assertThat(plan.delta().deleteChunkIds()).isEmpty();
    }

    @Test
    void fullReplaceIsForcedWhenManifestIsMissingOrChunkerVersionChanged() {
        NoteSearchDocument chunk = doc("a", 0, "same-a", "hash-1", 1, List.of());
        NoteIndexChunkManifest olderVersionManifest = new NoteIndexChunkManifest(
            chunk.userId(),
            chunk.documentGroupId(),
            chunk.noteId(),
            chunk.chunkId(),
            chunk.chunkIndex(),
            NoteChunkIndexHasher.embeddingTextHash(chunk),
            NoteChunkIndexHasher.payloadHash(chunk),
            MarkdownNoteChunker.CHUNKER_VERSION + 1,
            1,
            "hash-1",
            indexedAt
        );

        assertThat(planner.plan(
            List.of(),
            List.of(chunk),
            MarkdownNoteChunker.CHUNKER_VERSION,
            1,
            "hash-1",
            indexedAt,
            false
        ).fullReplace()).isTrue();
        assertThat(planner.plan(
            List.of(olderVersionManifest),
            List.of(chunk),
            MarkdownNoteChunker.CHUNKER_VERSION,
            1,
            "hash-1",
            indexedAt,
            false
        ).fullReplace()).isTrue();
    }

    private static List<NoteIndexChunkManifest> manifests(
        List<NoteSearchDocument> chunks,
        String markdownHash,
        int version
    ) {
        return chunks.stream()
            .map(chunk -> NoteIndexChunkManifest.fromDocument(
                chunk,
                MarkdownNoteChunker.CHUNKER_VERSION,
                version,
                markdownHash,
                Instant.parse("2026-06-24T00:00:00Z")
            ))
            .toList();
    }

    private static NoteSearchDocument doc(
        String chunkId,
        int chunkIndex,
        String text,
        String markdownHash,
        int version,
        List<String> keywordIds
    ) {
        return new NoteSearchDocument(
            "user-1",
            "group-1",
            "note-1",
            chunkId,
            chunkIndex,
            "Title",
            text,
            text,
            keywordIds,
            markdownHash,
            version,
            null,
            null
        );
    }
}
