package com.brainx.gateway.auth;

import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

final class JwtTokenTestSupport {
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private JwtTokenTestSupport() {
    }

    static String accessToken(String secret, String userId, String email, String role, Instant expiresAt) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", userId);
            payload.put("email", email);
            payload.put("role", role);
            payload.put("typ", "access");
            payload.put("iat", Instant.now().getEpochSecond());
            payload.put("exp", expiresAt.getEpochSecond());

            String encodedHeader = base64Url(OBJECT_MAPPER.writeValueAsBytes(header));
            String encodedPayload = base64Url(OBJECT_MAPPER.writeValueAsBytes(payload));
            String unsignedToken = encodedHeader + "." + encodedPayload;
            return unsignedToken + "." + sign(secret, unsignedToken);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create test token", exception);
        }
    }

    static String refreshToken(String secret, String userId, Instant expiresAt) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("sub", userId);
            payload.put("typ", "refresh");
            payload.put("iat", Instant.now().getEpochSecond());
            payload.put("exp", expiresAt.getEpochSecond());

            String encodedHeader = base64Url(OBJECT_MAPPER.writeValueAsBytes(header));
            String encodedPayload = base64Url(OBJECT_MAPPER.writeValueAsBytes(payload));
            String unsignedToken = encodedHeader + "." + encodedPayload;
            return unsignedToken + "." + sign(secret, unsignedToken);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create test token", exception);
        }
    }

    private static String sign(String secret, String unsignedToken) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
        return base64Url(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
