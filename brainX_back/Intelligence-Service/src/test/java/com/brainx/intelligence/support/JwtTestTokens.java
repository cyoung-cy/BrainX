package com.brainx.intelligence.support;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.databind.ObjectMapper;

public final class JwtTestTokens {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private JwtTestTokens() {
    }

    public static String accessToken(String secret, String userId) {
        Map<String, Object> payload = basePayload(userId, "access", Instant.now().plusSeconds(3600));
        return token(secret, payload);
    }

    public static String refreshToken(String secret, String userId) {
        Map<String, Object> payload = basePayload(userId, "refresh", Instant.now().plusSeconds(3600));
        return token(secret, payload);
    }

    public static String expiredAccessToken(String secret, String userId) {
        Map<String, Object> payload = basePayload(userId, "access", Instant.now().minusSeconds(60));
        return token(secret, payload);
    }

    public static String accessTokenWithoutSubject(String secret) {
        Map<String, Object> payload = basePayload("user-1", "access", Instant.now().plusSeconds(3600));
        payload.remove("sub");
        return token(secret, payload);
    }

    public static String token(String secret, Map<String, Object> payload) {
        try {
            Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
            String encodedHeader = base64Url(OBJECT_MAPPER.writeValueAsBytes(header));
            String encodedPayload = base64Url(OBJECT_MAPPER.writeValueAsBytes(payload));
            String unsignedToken = encodedHeader + "." + encodedPayload;
            return unsignedToken + "." + sign(secret, unsignedToken);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to create JWT test token.", exception);
        }
    }

    private static Map<String, Object> basePayload(String userId, String tokenType, Instant expiresAt) {
        Instant now = Instant.now();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", userId);
        payload.put("email", userId + "@example.com");
        payload.put("role", "USER");
        payload.put("typ", tokenType);
        payload.put("iat", now.getEpochSecond());
        payload.put("exp", expiresAt.getEpochSecond());
        return payload;
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
