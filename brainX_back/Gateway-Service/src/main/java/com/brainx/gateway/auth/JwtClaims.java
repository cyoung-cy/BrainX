package com.brainx.gateway.auth;

public record JwtClaims(
        String userId,
        String email,
        String role,
        String tokenType
) {
}
