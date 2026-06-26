package com.brainx.intelligence.infrastructure.vector.qdrant;

import java.util.List;
import java.util.Map;
import java.util.UUID;

interface QdrantVectorIndexClient {

    void upsert(List<QdrantVectorPoint> points);

    void deleteByPointIds(List<UUID> pointIds);

    void overwritePayload(UUID pointId, Map<String, Object> payload);

    void deleteByUserIdAndDocumentGroupIdAndNoteId(String userId, String documentGroupId, String noteId);

    List<QdrantVectorSearchHit> search(String userId, String documentGroupId, List<Double> vector, int limit);

    record QdrantVectorPoint(
        UUID id,
        List<Double> vector,
        Map<String, Object> payload
    ) {
    }

    record QdrantVectorSearchHit(
        String id,
        double score,
        Map<String, Object> payload
    ) {
    }
}
