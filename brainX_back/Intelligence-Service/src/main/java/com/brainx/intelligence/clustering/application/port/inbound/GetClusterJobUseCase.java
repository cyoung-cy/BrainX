package com.brainx.intelligence.clustering.application.port.inbound;

import com.brainx.intelligence.clustering.domain.ClusterJob;

public interface GetClusterJobUseCase {

    ClusterJob getClusterJob(GetClusterJobQuery query);

    record GetClusterJobQuery(
        String userId,
        String clusterJobId
    ) {
    }
}
