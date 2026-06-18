package com.brainx.intelligence.settings.application.port.outbound;

import java.util.Optional;

import com.brainx.intelligence.settings.domain.StyleProfile;

/**
 * 사용자 문체 프로필 저장소를 추상화하는 출력 포트입니다.
 */
public interface StyleProfilePort {

    StyleProfile save(StyleProfile styleProfile);

    Optional<StyleProfile> findStyleProfileByUserId(String userId);
}
