package com.brainx.intelligence.settings.domain;

/**
 * AI 사용 준비 도메인 규칙 위반을 표현하는 예외입니다.
 */
public class SettingsDomainException extends RuntimeException {

    public SettingsDomainException(String message) {
        super(message);
    }
}
