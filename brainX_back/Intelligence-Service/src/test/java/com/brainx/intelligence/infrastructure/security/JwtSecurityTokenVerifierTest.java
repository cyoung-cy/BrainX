package com.brainx.intelligence.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.support.JwtTestTokens;
import com.fasterxml.jackson.databind.ObjectMapper;

class JwtSecurityTokenVerifierTest {

    private static final String SECRET = "test-jwt-secret-for-intelligence-service";

    private final JwtTokenVerifier verifier = new JwtTokenVerifier(new ObjectMapper(), SECRET);

    @Test
    void verifiesValidAccessToken() {
        JwtTokenVerifier.JwtClaims claims = verifier.verifyAccessToken(JwtTestTokens.accessToken(SECRET, "usr_1"));

        assertThat(claims.userId()).isEqualTo("usr_1");
        assertThat(claims.email()).isEqualTo("usr_1@example.com");
        assertThat(claims.role()).isEqualTo("USER");
        assertThat(claims.tokenType()).isEqualTo("access");
    }

    @Test
    void rejectsRefreshToken() {
        String token = JwtTestTokens.refreshToken(SECRET, "usr_1");

        assertThatThrownBy(() -> verifier.verifyAccessToken(token))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported token type");
    }

    @Test
    void rejectsExpiredToken() {
        String token = JwtTestTokens.expiredAccessToken(SECRET, "usr_1");

        assertThatThrownBy(() -> verifier.verifyAccessToken(token))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Expired token");
    }

    @Test
    void rejectsTamperedToken() {
        String token = JwtTestTokens.accessToken(SECRET, "usr_1");
        String tamperedToken = token.substring(0, token.length() - 1)
            + (token.endsWith("a") ? "b" : "a");

        assertThatThrownBy(() -> verifier.verifyAccessToken(tamperedToken))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid token");
    }

    @Test
    void rejectsTokenWithoutSubject() {
        String token = JwtTestTokens.accessTokenWithoutSubject(SECRET);

        assertThatThrownBy(() -> verifier.verifyAccessToken(token))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Missing subject");
    }
}
