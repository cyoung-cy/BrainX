package com.brainx.intelligence.settings.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class AiModelAvailabilityPolicyTest {

    @Test
    void preservesEnabledModelIdsWithoutDuplicatesOrBlankValues() {
        var policy = new AiModelAvailabilityPolicy(List.of(
            "gpt-4o",
            "",
            "gpt-4o-mini",
            "gpt-4o"
        ));

        assertThat(policy.enabledModelIds()).containsExactly("gpt-4o", "gpt-4o-mini");
    }

    @Test
    void treatsNullEnabledModelIdsAsEmpty() {
        var policy = new AiModelAvailabilityPolicy(null);

        assertThat(policy.enabledModelIds()).isEmpty();
    }
}
