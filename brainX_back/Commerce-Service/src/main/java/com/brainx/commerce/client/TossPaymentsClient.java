package com.brainx.commerce.client;

import com.brainx.commerce.exception.CommerceException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Component
public class TossPaymentsClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String secretKey;
    private final String confirmUrl;

    public TossPaymentsClient(RestTemplate restTemplate,
                              ObjectMapper objectMapper,
                              @Value("${toss.secret-key}") String secretKey,
                              @Value("${toss.confirm-url}") String confirmUrl) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.secretKey = secretKey;
        this.confirmUrl = confirmUrl;
    }

    /**
     * Toss Payments 결제 승인(confirm) API를 호출한다. 성공하면 status가 "DONE"인
     * 응답 바디를 그대로 반환하고, 실패하면 Toss가 내려준 code/message를 그대로
     * CommerceException으로 변환해서 던진다 (PaymentFailed 이벤트 발행에 사용).
     */
    @SuppressWarnings("unchecked")
    public TossConfirmResult confirm(String paymentKey, String orderId, long amount) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + Base64.getEncoder().encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8)));
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "paymentKey", paymentKey,
                "orderId", orderId,
                "amount", amount
        );

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(confirmUrl, new HttpEntity<>(body, headers), Map.class);
            Map<String, Object> data = response.getBody();
            String status = data == null ? null : (String) data.get("status");
            String paymentMethod = resolvePaymentMethod(data);
            return new TossConfirmResult(true, status, paymentMethod, null, null);
        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            log.warn("Toss 결제 승인 실패: orderId={}, status={}, body={}", orderId, e.getStatusCode(), responseBody);
            Map<String, Object> errorBody = parseErrorBody(responseBody);
            String code = (String) errorBody.getOrDefault("code", "TOSS_CONFIRM_FAILED");
            String message = (String) errorBody.getOrDefault("message", "결제 승인에 실패했습니다.");
            return new TossConfirmResult(false, null, null, code, message);
        } catch (Exception e) {
            log.error("Toss 결제 승인 호출 중 오류: orderId={}, error={}", orderId, e.getMessage());
            throw CommerceException.paymentFailed("결제 승인 서버 호출에 실패했습니다: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseErrorBody(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(responseBody, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private String resolvePaymentMethod(Map<String, Object> data) {
        if (data == null) {
            return "TOSS";
        }

        Object method = data.get("method");
        if ("간편결제".equals(method)) {
            Object easyPay = data.get("easyPay");
            if (easyPay instanceof Map<?, ?> easyPayMap) {
                Object provider = easyPayMap.get("provider");
                if (provider instanceof String providerName && !providerName.isBlank()) {
                    return "간편결제(" + providerName + ")";
                }
            }
            return "간편결제";
        }

        Object card = data.get("card");
        if (card instanceof Map<?, ?> cardMap) {
            Object cardType = cardMap.get("cardType");
            if ("체크".equals(cardType)) {
                return "체크카드";
            }
            if ("신용".equals(cardType)) {
                return "신용카드";
            }
        }

        if (method instanceof String methodName && !methodName.isBlank()) {
            return methodName;
        }
        return "TOSS";
    }

    @Getter
    public static class TossConfirmResult {
        private final boolean approved;
        private final String status;
        private final String paymentMethod;
        private final String errorCode;
        private final String errorMessage;

        public TossConfirmResult(boolean approved, String status, String paymentMethod, String errorCode, String errorMessage) {
            this.approved = approved;
            this.status = status;
            this.paymentMethod = paymentMethod;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
        }
    }
}
