package com.brainx.intelligence.clustering.application.port.outbound;

import java.util.Map;

public interface ClusteringEventPort {

    void clusterJobRequested(ClusterJobRequestedEvent event);

    void clusterJobCompleted(ClusterJobCompletedEvent event);

    record ClusterJobRequestedEvent(
        String userId,
        String clusterJobId,
        Map<String, Object> scope,
        Map<String, Object> algorithmOptions
    ) {
    }

    record ClusterJobCompletedEvent(
        String userId,
        String clusterJobId,
        int clusterCount
    ) {
    }
}
