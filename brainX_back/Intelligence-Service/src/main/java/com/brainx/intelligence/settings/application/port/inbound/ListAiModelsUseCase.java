package com.brainx.intelligence.settings.application.port.inbound;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 사용 가능한 AI 모델 목록을 조회합니다.
 */
public interface ListAiModelsUseCase {

    AiModelsResult listAiModels();

    record AiModelsResult(
        List<AiModelView> models,
        List<String> enabledModels,
        Map<String, Object> costInfo
    ) {
    }

    record AiModelView(
        String modelId,
        String name,
        String provider,
        BigDecimal costPer1kTokens
    ) {
    }
}
