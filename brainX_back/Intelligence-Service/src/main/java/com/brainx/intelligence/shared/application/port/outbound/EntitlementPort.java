package com.brainx.intelligence.shared.application.port.outbound;

/**
 * AI 기능 사용 권한과 사용 가능량 판단을 Commerce 도메인에 위임하기 위한 출력 포트입니다.
 */
public interface EntitlementPort {

    EntitlementDecision checkEntitlement(EntitlementRequest request);

    record EntitlementRequest(
        String userId,
        String capability,
        Integer requestedTokenEstimate
    ) {
    }

    record EntitlementDecision(
        boolean allowed,
        String reasonCode,
        Integer remainingTokenQuota
    ) {
    }
}
