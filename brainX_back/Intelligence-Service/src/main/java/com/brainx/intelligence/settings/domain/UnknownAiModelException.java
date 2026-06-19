package com.brainx.intelligence.settings.domain;

/**
 * 사용자가 선택한 AI 모델이 catalog에 없을 때 발생합니다.
 */
public class UnknownAiModelException extends SettingsDomainException {

    public UnknownAiModelException(String modelId) {
        super("Unknown AI model: " + modelId);
    }
}
