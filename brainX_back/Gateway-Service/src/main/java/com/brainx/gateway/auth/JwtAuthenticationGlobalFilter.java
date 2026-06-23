package com.brainx.gateway.auth;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
public class JwtAuthenticationGlobalFilter implements GlobalFilter, Ordered {
    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_EMAIL_HEADER = "X-User-Email";
    public static final String USER_ROLE_HEADER = "X-User-Role";

    private static final String BEARER_PREFIX = "Bearer ";
    private static final int AUTH_FILTER_ORDER = -100;

    private final JwtTokenVerifier jwtTokenVerifier;
    private final GatewayAuthProperties authProperties;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthenticationGlobalFilter(JwtTokenVerifier jwtTokenVerifier, GatewayAuthProperties authProperties) {
        this.jwtTokenVerifier = jwtTokenVerifier;
        this.authProperties = authProperties;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = sanitizeInternalHeaders(exchange.getRequest());
        ServerWebExchange sanitizedExchange = exchange.mutate().request(request).build();

        if (isPublicRequest(request)) {
            return chain.filter(sanitizedExchange);
        }

        Optional<String> token = bearerToken(request);
        if (token.isEmpty()) {
            return unauthorized(sanitizedExchange);
        }

        try {
            JwtClaims claims = jwtTokenVerifier.verifyAccessToken(token.get());
            ServerHttpRequest authenticatedRequest = request.mutate()
                    .headers(headers -> {
                        headers.set(USER_ID_HEADER, claims.userId());
                        setIfPresent(headers, USER_EMAIL_HEADER, claims.email());
                        setIfPresent(headers, USER_ROLE_HEADER, claims.role());
                    })
                    .build();
            return chain.filter(sanitizedExchange.mutate().request(authenticatedRequest).build());
        } catch (IllegalArgumentException exception) {
            return unauthorized(sanitizedExchange);
        }
    }

    @Override
    public int getOrder() {
        return AUTH_FILTER_ORDER;
    }

    private boolean isPublicRequest(ServerHttpRequest request) {
        if (HttpMethod.OPTIONS.equals(request.getMethod())) {
            return true;
        }

        String path = request.getPath().pathWithinApplication().value();
        return authProperties.getPublicPaths().stream()
                .anyMatch(pattern -> pathMatcher.match(pattern, path));
    }

    private Optional<String> bearerToken(ServerHttpRequest request) {
        String authorization = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            return Optional.empty();
        }

        String token = authorization.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? Optional.empty() : Optional.of(token);
    }

    private ServerHttpRequest sanitizeInternalHeaders(ServerHttpRequest request) {
        return request.mutate()
                .headers(headers -> {
                    headers.remove(USER_ID_HEADER);
                    headers.remove(USER_EMAIL_HEADER);
                    headers.remove(USER_ROLE_HEADER);
                })
                .build();
    }

    private void setIfPresent(HttpHeaders headers, String name, String value) {
        if (value != null && !value.isBlank()) {
            headers.set(name, value);
        }
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        byte[] body = "{\"message\":\"Unauthorized\"}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
    }
}
