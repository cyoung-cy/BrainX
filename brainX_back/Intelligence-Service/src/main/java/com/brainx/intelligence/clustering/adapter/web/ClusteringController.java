package com.brainx.intelligence.clustering.adapter.web;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.brainx.intelligence.clustering.application.port.inbound.GetClusterJobUseCase;
import com.brainx.intelligence.clustering.application.port.inbound.GetClusterJobUseCase.GetClusterJobQuery;
import com.brainx.intelligence.clustering.application.port.inbound.RequestClusterJobUseCase;
import com.brainx.intelligence.clustering.application.port.inbound.RequestClusterJobUseCase.ClusterJobCommand;
import com.brainx.intelligence.clustering.domain.Cluster;
import com.brainx.intelligence.clustering.domain.ClusterJob;
import com.brainx.intelligence.clustering.domain.ClusterJobStatus;
import com.brainx.intelligence.infrastructure.web.ApiSuccessResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@Validated
public class ClusteringController {

    private final RequestClusterJobUseCase requestClusterJobUseCase;
    private final GetClusterJobUseCase getClusterJobUseCase;

    public ClusteringController(
        RequestClusterJobUseCase requestClusterJobUseCase,
        GetClusterJobUseCase getClusterJobUseCase
    ) {
        this.requestClusterJobUseCase = requestClusterJobUseCase;
        this.getClusterJobUseCase = getClusterJobUseCase;
    }

    @PostMapping("/api/v1/ai/clusters")
    public ResponseEntity<ApiSuccessResponse<ClusterJobData>> requestClusterJob(
        Principal principal,
        @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
        @Valid @RequestBody ClusterJobCreateRequest request
    ) {
        ClusterJob job = requestClusterJobUseCase.requestClusterJob(new ClusterJobCommand(
            userId(principal),
            request.scope(),
            request.algorithmOptions(),
            idempotencyKey
        ));
        return ResponseEntity.status(HttpStatus.ACCEPTED)
            .body(ApiSuccessResponse.ok(toData(job)));
    }

    @GetMapping("/api/v1/ai/clusters/{clusterJobId}")
    public ApiSuccessResponse<ClusterJobData> getClusterJob(
        Principal principal,
        @PathVariable @NotBlank String clusterJobId
    ) {
        ClusterJob job = getClusterJobUseCase.getClusterJob(new GetClusterJobQuery(
            userId(principal),
            clusterJobId
        ));
        return ApiSuccessResponse.ok(toData(job));
    }

    private static ClusterJobData toData(ClusterJob job) {
        return new ClusterJobData(
            job.clusterJobId(),
            job.status(),
            job.clusters().stream()
                .map(ClusteringController::toClusterMap)
                .toList()
        );
    }

    private static Map<String, Object> toClusterMap(Cluster cluster) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("clusterId", cluster.clusterId());
        values.put("title", cluster.title());
        values.put("summary", cluster.summary());
        values.put("noteIds", cluster.noteIds());
        values.put("keywords", cluster.keywords());
        values.put("confidence", cluster.confidence());
        return values;
    }

    private static String userId(Principal principal) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            return authentication.getName();
        }
        throw new IllegalArgumentException("Authenticated user is required.");
    }

    record ClusterJobCreateRequest(
        @NotNull Map<String, Object> scope,
        Map<String, Object> algorithmOptions
    ) {
    }

    record ClusterJobData(
        String clusterJobId,
        ClusterJobStatus status,
        List<Map<String, Object>> clusters
    ) {
    }
}
