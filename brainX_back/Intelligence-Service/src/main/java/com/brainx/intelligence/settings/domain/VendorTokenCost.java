package com.brainx.intelligence.settings.domain;

import java.math.BigDecimal;

/**
 * 벤더사 모델의 입력/출력 토큰 기준 단가입니다.
 */
public record VendorTokenCost(
    BigDecimal inputCostPer1kTokens,
    BigDecimal outputCostPer1kTokens
) {

    public VendorTokenCost {
        validateNonNegative(inputCostPer1kTokens, "inputCostPer1kTokens");
        validateNonNegative(outputCostPer1kTokens, "outputCostPer1kTokens");
    }

    public static VendorTokenCost unknown() {
        return new VendorTokenCost(null, null);
    }

    private static void validateNonNegative(BigDecimal value, String name) {
        if (value != null && value.signum() < 0) {
            throw new SettingsDomainException(name + " must not be negative.");
        }
    }
}
