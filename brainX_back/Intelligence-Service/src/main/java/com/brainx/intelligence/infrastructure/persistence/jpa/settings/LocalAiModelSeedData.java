package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile({"local", "dev-ui"})
class LocalAiModelSeedData implements ApplicationRunner {

    private static final String VOYAGE_PROVIDER = "voyage";
    private static final String USD = "USD";

    private final AiModelJpaRepository aiModelJpaRepository;

    LocalAiModelSeedData(AiModelJpaRepository aiModelJpaRepository) {
        this.aiModelJpaRepository = aiModelJpaRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedModels().forEach(aiModelJpaRepository::save);
    }

    private static List<AiModelJpaEntity> seedModels() {
        return List.of(
            voyage("voyage-4-large", "Voyage 4 Large", "0.000120"),
            voyage("voyage-4", "Voyage 4", "0.000060"),
            voyage("voyage-4-lite", "Voyage 4 Lite", "0.000020"),
            voyage("voyage-context-3", "Voyage Context 3", "0.000180")
        );
    }

    private static AiModelJpaEntity voyage(String modelId, String name, String inputCostPer1kTokens) {
        return new AiModelJpaEntity(
            modelId,
            name,
            VOYAGE_PROVIDER,
            new BigDecimal(inputCostPer1kTokens),
            null,
            null,
            USD
        );
    }
}
