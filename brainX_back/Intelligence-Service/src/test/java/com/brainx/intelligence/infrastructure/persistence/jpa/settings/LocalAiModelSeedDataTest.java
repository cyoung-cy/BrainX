package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class LocalAiModelSeedDataTest {

    @Autowired
    private AiModelJpaRepository aiModelJpaRepository;

    @Test
    void seedsVoyageEmbeddingModelsWithPer1kInputCost() throws Exception {
        new LocalAiModelSeedData(aiModelJpaRepository).run(null);

        assertThat(aiModelJpaRepository.findAll())
            .extracting(AiModelJpaEntity::getModelId)
            .containsExactlyInAnyOrder(
                "voyage-4-large",
                "voyage-4",
                "voyage-4-lite",
                "voyage-context-3"
            );

        var lite = aiModelJpaRepository.findById("voyage-4-lite").orElseThrow().toDomain();
        assertThat(lite.name()).isEqualTo("Voyage 4 Lite");
        assertThat(lite.provider()).isEqualTo("voyage");
        assertThat(lite.vendorTokenCost().inputCostPer1kTokens()).isEqualByComparingTo("0.000020");
        assertThat(lite.vendorTokenCost().cachedInputCostPer1kTokens()).isNull();
        assertThat(lite.vendorTokenCost().outputCostPer1kTokens()).isNull();
        assertThat(lite.vendorTokenCost().currencyCode()).isEqualTo("USD");

        var context = aiModelJpaRepository.findById("voyage-context-3").orElseThrow().toDomain();
        assertThat(context.vendorTokenCost().inputCostPer1kTokens()).isEqualByComparingTo("0.000180");
    }
}
