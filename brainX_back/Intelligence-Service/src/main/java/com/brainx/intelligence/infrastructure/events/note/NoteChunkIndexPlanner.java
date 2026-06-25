package com.brainx.intelligence.infrastructure.events.note;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.brainx.intelligence.exploration.domain.NoteSearchDocument;

@Component
class NoteChunkIndexPlanner {

    private static final double FULL_REPLACE_CHANGE_RATIO_THRESHOLD = 0.5d;

    NoteChunkIndexPlan plan(
        List<NoteIndexChunkManifest> previousManifests,
        List<NoteSearchDocument> chunks,
        int chunkerVersion,
        Integer indexedVersion,
        String indexedMarkdownHash,
        Instant indexedAt,
        boolean forceFullReplace
    ) {
        List<NoteIndexChunkManifest> safePrevious = previousManifests == null ? List.of() : previousManifests;
        List<NoteSearchDocument> safeChunks = chunks == null ? List.of() : chunks;
        List<NoteIndexChunkManifest> nextManifests = safeChunks.stream()
            .map(chunk -> NoteIndexChunkManifest.fromDocument(
                chunk,
                chunkerVersion,
                indexedVersion,
                indexedMarkdownHash,
                indexedAt
            ))
            .toList();

        if (forceFullReplace || safePrevious.isEmpty() || chunkerVersionChanged(safePrevious, chunkerVersion)) {
            return NoteChunkIndexPlan.fullReplace(safeChunks, nextManifests);
        }

        Map<String, NoteIndexChunkManifest> previousByChunkId = byChunkId(safePrevious);
        Map<String, NoteIndexChunkManifest> nextByChunkId = byChunkId(nextManifests);
        List<NoteSearchDocument> upsertChunks = new ArrayList<>();
        List<NoteSearchDocument> payloadOnlyChunks = new ArrayList<>();
        for (int index = 0; index < safeChunks.size(); index++) {
            NoteSearchDocument chunk = safeChunks.get(index);
            NoteIndexChunkManifest next = nextManifests.get(index);
            NoteIndexChunkManifest previous = previousByChunkId.get(chunk.chunkId());
            if (previous == null || !previous.embeddingTextHash().equals(next.embeddingTextHash())) {
                upsertChunks.add(chunk);
                continue;
            }
            if (!previous.payloadHash().equals(next.payloadHash())) {
                payloadOnlyChunks.add(chunk);
            }
        }

        List<String> deleteChunkIds = safePrevious.stream()
            .map(NoteIndexChunkManifest::chunkId)
            .filter(chunkId -> !nextByChunkId.containsKey(chunkId))
            .toList();

        if (changedRatio(safePrevious.size(), safeChunks.size(), upsertChunks.size(), deleteChunkIds.size())
            > FULL_REPLACE_CHANGE_RATIO_THRESHOLD) {
            return NoteChunkIndexPlan.fullReplace(safeChunks, nextManifests);
        }

        return NoteChunkIndexPlan.delta(upsertChunks, deleteChunkIds, payloadOnlyChunks, nextManifests);
    }

    private static boolean chunkerVersionChanged(List<NoteIndexChunkManifest> manifests, int chunkerVersion) {
        return manifests.stream().anyMatch(manifest -> manifest.chunkerVersion() != chunkerVersion);
    }

    private static Map<String, NoteIndexChunkManifest> byChunkId(List<NoteIndexChunkManifest> manifests) {
        Map<String, NoteIndexChunkManifest> values = new LinkedHashMap<>();
        for (NoteIndexChunkManifest manifest : manifests) {
            values.put(manifest.chunkId(), manifest);
        }
        return values;
    }

    private static double changedRatio(int previousSize, int nextSize, int upsertCount, int deleteCount) {
        int denominator = Math.max(previousSize, nextSize);
        if (denominator <= 0) {
            return 0.0d;
        }
        return (double) (upsertCount + deleteCount) / denominator;
    }
}
