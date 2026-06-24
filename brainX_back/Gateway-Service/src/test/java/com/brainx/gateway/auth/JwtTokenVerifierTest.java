package com.brainx.gateway.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenVerifierTest {
    private static final String SECRET = "test-secret-with-at-least-32-byte-value";

    private final JwtTokenVerifier verifier = new JwtTokenVerifier(new ObjectMapper(), SECRET);

    @Test
    void verifiesAccessTokenClaims() {
        String token = JwtTokenTestSupport.accessToken(
                SECRET,
                "usr_123",
                "user@example.com",
                "ROLE_USER",
                Instant.now().plusSeconds(60)
        );

        JwtClaims claims = verifier.verifyAccessToken(token);

        assertThat(claims.userId()).isEqualTo("usr_123");
        assertThat(claims.email()).isEqualTo("user@example.com");
        assertThat(claims.role()).isEqualTo("ROLE_USER");
        assertThat(claims.tokenType()).isEqualTo("access");
    }

    @Test
    void rejectsExpiredToken() {
        String token = JwtTokenTestSupport.accessToken(
                SECRET,
                "usr_123",
                "user@example.com",
                "ROLE_USER",
                Instant.now().minusSeconds(1)
        );

        assertThatThrownBy(() -> verifier.verifyAccessToken(token))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsRefreshToken() {
        String token = JwtTokenTestSupport.refreshToken(
                SECRET,
                "usr_123",
                Instant.now().plusSeconds(60)
        );

        assertThatThrownBy(() -> verifier.verifyAccessToken(token))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
