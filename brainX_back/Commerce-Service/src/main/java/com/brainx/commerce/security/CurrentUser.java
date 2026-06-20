package com.brainx.commerce.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {
    // TEMP: 로그인 없이 결제 기능 테스트용 고정 사용자 ID. 실제 로그인 연동 완료 후 제거할 것.
    private static final String DEV_TEST_USER_ID = "dev-test-user";

    public String userId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.userId();
        }
        // TEMP: 로그인 없이 테스트용 폴백. permitAll 경로는 Spring Security가 anonymousUser
        // Authentication을 채워 넣으므로 authentication == null 체크만으로는 잡히지 않는다.
        // 실제 로그인 연동 완료 후 이 폴백을 제거하고 401을 던지도록 되돌릴 것.
        return DEV_TEST_USER_ID;
    }
}
