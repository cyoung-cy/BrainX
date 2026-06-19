package com.brainx.intelligence.infrastructure.security;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

import com.brainx.intelligence.infrastructure.web.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Public API 최소 보안 설정입니다.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        return http
            .csrf(csrf -> csrf.ignoringRequestMatchers("/api/v1/**"))
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(Customizer.withDefaults())
            .exceptionHandling(exceptionHandling -> exceptionHandling
                .authenticationEntryPoint((request, response, exception) ->
                    writeError(response, objectMapper, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required."))
                .accessDeniedHandler((request, response, exception) ->
                    writeError(response, objectMapper, HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden."))
            )
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/api/v1/**").authenticated()
                .anyRequest().permitAll()
            )
            .build();
    }

    private static void writeError(
        HttpServletResponse response,
        ObjectMapper objectMapper,
        HttpStatus status,
        String code,
        String message
    ) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), ApiErrorResponse.of(code, message));
    }
}
