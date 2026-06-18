package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import java.math.BigDecimal;

import com.brainx.intelligence.settings.domain.AiModel;
import com.brainx.intelligence.settings.domain.VendorTokenCost;

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

    @Column(name = "vendor_input_cost_per_1k_tokens", precision = 12, scale = 6)
    private BigDecimal vendorInputCostPer1kTokens;

    @Column(name = "vendor_output_cost_per_1k_tokens", precision = 12, scale = 6)
    private BigDecimal vendorOutputCostPer1kTokens;

    protected AiModelJpaEntity() {
    }

    public AiModelJpaEntity(
        String modelId,
        String name,
        String provider,
        BigDecimal vendorInputCostPer1kTokens,
        BigDecimal vendorOutputCostPer1kTokens
    ) {
        this.modelId = modelId;
        this.name = name;
        this.provider = provider;
        this.vendorInputCostPer1kTokens = vendorInputCostPer1kTokens;
        this.vendorOutputCostPer1kTokens = vendorOutputCostPer1kTokens;
    }

    static AiModelJpaEntity fromDomain(AiModel model) {
        return new AiModelJpaEntity(
            model.modelId(),
            model.name(),
            model.provider(),
            model.vendorTokenCost().inputCostPer1kTokens(),
            model.vendorTokenCost().outputCostPer1kTokens()
        );
    }

    AiModel toDomain() {
        return new AiModel(
            modelId,
            name,
            provider,
            new VendorTokenCost(vendorInputCostPer1kTokens, vendorOutputCostPer1kTokens)
        );
    }

    public String getModelId() {
        return modelId;
    }
}
