package com.brainx.intelligence.settings.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class AiPricingPolicyTest {

    @Test
    void createsDefaultTokenPolicy() {
        AiPricingPolicy policy = AiPricingPolicy.defaultTokenPolicy();

        assertThat(policy.billingUnit()).isEqualTo("TOKEN");
        assertThat(policy.summary()).isEmpty();
        assertThat(policy.details()).isEmpty();
    }

    @Test
    void normalizesNullSummaryAndDetails() {
        AiPricingPolicy policy = new AiPricingPolicy("TOKEN", null, null);

        assertThat(policy.summary()).isEmpty();
        assertThat(policy.details()).isEmpty();
    }

    @Test
    void preservesDetails() {
        AiPricingPolicy policy = new AiPricingPolicy("TOKEN", "usage based", Map.of("freeTier", 1000));

        assertThat(policy.details()).containsEntry("freeTier", 1000);
    }
}
