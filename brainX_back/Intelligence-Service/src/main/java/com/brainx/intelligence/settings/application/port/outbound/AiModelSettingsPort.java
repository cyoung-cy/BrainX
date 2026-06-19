package com.brainx.intelligence.settings.application.port.outbound;

import java.util.Optional;

import com.brainx.intelligence.settings.domain.AiModelSettings;

/**
 * 사용자 AI 모델 설정 저장소를 추상화하는 출력 포트입니다.
 */
public interface AiModelSettingsPort {

    AiModelSettings save(AiModelSettings settings);

    Optional<AiModelSettings> findSettingsByUserId(String userId);
}
