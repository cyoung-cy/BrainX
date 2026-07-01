package com.brainx.workspace.security;

import com.brainx.workspace.exception.WorkspaceException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentActor {
    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String GUEST_ID_HEADER = "X-Guest-Id";

    private static final String DEV_TEST_USER_ID = "dev-test-user";

    private final HttpServletRequest request;

    @Value("${brainx.workspace.dev-fallback-enabled:false}")
    private boolean devFallbackEnabled;

    public CurrentActor(HttpServletRequest request) {
        this.request = request;
    }

    public Actor actor() {
        String userId = request.getHeader(USER_ID_HEADER);
        if (hasText(userId)) {
            return new Actor(ActorType.USER, userId);
        }

        String guestId = request.getHeader(GUEST_ID_HEADER);
        if (hasText(guestId)) {
            return new Actor(ActorType.GUEST, guestId);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return new Actor(ActorType.USER, user.userId());
        }

        // brainx.workspace.dev-fallback-enabled는 기본 false다 — 로컬 개발에서 Gateway를 거치지
        // 않고 Workspace-Service(8082)를 직접 호출할 때만 명시적으로 켜서 쓴다. 운영에서는 절대
        // 켜면 안 된다: X-User-Id/X-Guest-Id/JWT가 전부 없으면 식별 실패로 처리해야 한다.
        if (devFallbackEnabled) {
            return new Actor(ActorType.USER, DEV_TEST_USER_ID);
        }

        throw new WorkspaceException(HttpStatus.UNAUTHORIZED, "ACTOR_IDENTIFICATION_FAILED",
                "X-User-Id, X-Guest-Id, or a valid Authorization token is required.");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    public enum ActorType {
        USER,
        GUEST
    }

    public record Actor(ActorType type, String id) {
    }
}
