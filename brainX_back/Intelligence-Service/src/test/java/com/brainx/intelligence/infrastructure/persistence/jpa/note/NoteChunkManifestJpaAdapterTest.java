package com.brainx.intelligence.infrastructure.persistence.jpa.note;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.brainx.intelligence.infrastructure.events.note.MarkdownNoteChunker;
import com.brainx.intelligence.infrastructure.events.note.NoteIndexChunkManifest;

@DataJpaTest
@ActiveProfiles("test")
@Import(NoteChunkManifestJpaAdapter.class)
class NoteChunkManifestJpaAdapterTest {

    @Autowired
    private NoteChunkManifestJpaAdapter adapter;

    @Test
    void replaceAndFindManifestsForNotePreservesChunkOrder() {
        adapter.replaceForNote("user-1", "group-1", "note-1", List.of(
            manifest("chunk-2", 1, "payload-2"),
            manifest("chunk-1", 0, "payload-1")
        ));

        var manifests = adapter.findByUserIdAndDocumentGroupIdAndNoteId("user-1", "group-1", "note-1");

        assertThat(manifests).extracting(NoteIndexChunkManifest::chunkId)
            .containsExactly("chunk-1", "chunk-2");
        assertThat(manifests.getFirst().documentGroupId()).isEqualTo("group-1");
        assertThat(manifests.getFirst().indexedMarkdownHash()).isEqualTo("hash-1");
    }

    @Test
    void replaceRemovesPreviousManifestRowsForSameNoteOnly() {
        adapter.replaceForNote("user-1", "group-1", "note-1", List.of(
            manifest("old-1", 0, "payload-old")
        ));
        adapter.replaceForNote("user-1", "group-2", "note-1", List.of(
            manifest("other-group", 0, "payload-other", "group-2")
        ));

        adapter.replaceForNote("user-1", "group-1", "note-1", List.of(
            manifest("new-1", 0, "payload-new")
        ));

        assertThat(adapter.findByUserIdAndDocumentGroupIdAndNoteId("user-1", "group-1", "note-1"))
            .extracting(NoteIndexChunkManifest::chunkId)
            .containsExactly("new-1");
        assertThat(adapter.findByUserIdAndDocumentGroupIdAndNoteId("user-1", "group-2", "note-1"))
            .extracting(NoteIndexChunkManifest::chunkId)
            .containsExactly("other-group");
    }

    @Test
    void deleteRemovesManifestRowsForOneDocumentGroupNote() {
        adapter.replaceForNote("user-1", "group-1", "note-1", List.of(
            manifest("chunk-1", 0, "payload-1")
        ));

        adapter.deleteByUserIdAndDocumentGroupIdAndNoteId("user-1", "group-1", "note-1");

        assertThat(adapter.findByUserIdAndDocumentGroupIdAndNoteId("user-1", "group-1", "note-1")).isEmpty();
    }

    private static NoteIndexChunkManifest manifest(String chunkId, int chunkIndex, String payloadHash) {
        return manifest(chunkId, chunkIndex, payloadHash, "group-1");
    }

    private static NoteIndexChunkManifest manifest(
        String chunkId,
        int chunkIndex,
        String payloadHash,
        String documentGroupId
    ) {
        return new NoteIndexChunkManifest(
            "user-1",
            documentGroupId,
            "note-1",
            chunkId,
            chunkIndex,
            "a".repeat(64),
            payloadHash,
            MarkdownNoteChunker.CHUNKER_VERSION,
            1,
            "hash-1",
            Instant.parse("2026-06-25T00:00:00Z")
        );
    }
}
