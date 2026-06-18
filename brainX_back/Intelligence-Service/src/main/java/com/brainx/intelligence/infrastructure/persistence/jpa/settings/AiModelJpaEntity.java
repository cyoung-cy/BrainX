package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import java.math.BigDecimal;

import com.brainx.intelligence.settings.domain.AiModel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ai_models")
public class AiModelJpaEntity {

    @Id
    @Column(name = "model_id", nullable = false, length = 100)
    private String modelId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "provider", nullable = false, length = 100)
    private String provider;

    @Column(name = "cost_per_1k_tokens", precision = 12, scale = 6)
    private BigDecimal costPer1kTokens;

    protected AiModelJpaEntity() {
    }

    public AiModelJpaEntity(
        String modelId,
        String name,
        String provider,
        BigDecimal costPer1kTokens
    ) {
        this.modelId = modelId;
        this.name = name;
        this.provider = provider;
        this.costPer1kTokens = costPer1kTokens;
    }

    static AiModelJpaEntity fromDomain(AiModel model) {
        return new AiModelJpaEntity(
            model.modelId(),
            model.name(),
            model.provider(),
            model.costPer1kTokens()
        );
    }

    AiModel toDomain() {
        return new AiModel(modelId, name, provider, costPer1kTokens);
    }

    public String getModelId() {
        return modelId;
    }
}
