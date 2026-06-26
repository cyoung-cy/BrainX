package com.brainx.intelligence.clustering.application.port.inbound;

import java.util.Map;

import com.brainx.intelligence.clustering.domain.ClusterJob;

public interface RequestClusterJobUseCase {

    ClusterJob requestClusterJob(ClusterJobCommand command);

    record ClusterJobCommand(
        String userId,
        Map<String, Object> scope,
        Map<String, Object> algorithmOptions,
        String idempotencyKey
    ) {
    }
}
