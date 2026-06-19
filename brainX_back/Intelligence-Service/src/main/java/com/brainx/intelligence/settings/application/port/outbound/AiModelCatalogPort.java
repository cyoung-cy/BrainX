package com.brainx.intelligence.settings.application.port.outbound;

import java.util.List;

import com.brainx.intelligence.settings.domain.AiModel;

/**
 * AI 모델 catalog 조회를 추상화하는 출력 포트입니다.
 */
public interface AiModelCatalogPort {

    List<AiModel> findAll();

    boolean existsByModelId(String modelId);
}
