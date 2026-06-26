package com.brainx.intelligence.infrastructure.events.note;

import java.util.List;

import com.brainx.intelligence.exploration.application.port.outbound.NoteSearchIndexPort.NoteChunkDelta;
import com.brainx.intelligence.exploration.domain.NoteSearchDocument;

record NoteChunkIndexPlan(
    boolean fullReplace,
    NoteChunkDelta delta,
    List<NoteIndexChunkManifest> manifests
) {

    static NoteChunkIndexPlan fullReplace(
        List<NoteSearchDocument> chunks,
        List<NoteIndexChunkManifest> manifests
    ) {
        return new NoteChunkIndexPlan(true, new NoteChunkDelta(chunks, List.of(), List.of()), manifests);
    }

    static NoteChunkIndexPlan delta(
        List<NoteSearchDocument> upsertChunks,
        List<String> deleteChunkIds,
        List<NoteSearchDocument> payloadOnlyChunks,
        List<NoteIndexChunkManifest> manifests
    ) {
        return new NoteChunkIndexPlan(
            false,
            new NoteChunkDelta(upsertChunks, deleteChunkIds, payloadOnlyChunks),
            manifests
        );
    }
}
