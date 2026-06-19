package com.brainx.intelligence.settings.domain;

import java.util.LinkedHashSet;
import java.util.List;

/**
 * 외부 권한/플랜 도메인이 판단한 AI 모델 사용 가능 정책입니다.
 */
public record AiModelAvailabilityPolicy(
    List<String> enabledModelIds
) {

    public AiModelAvailabilityPolicy {
        enabledModelIds = enabledModelIds == null
            ? List.of()
            : enabledModelIds.stream()
                .filter(modelId -> modelId != null && !modelId.isBlank())
                .collect(java.util.stream.Collectors.collectingAndThen(
                    java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                    List::copyOf
                ));
    }

    public static AiModelAvailabilityPolicy none() {
        return new AiModelAvailabilityPolicy(List.of());
    }
}
