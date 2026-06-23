package com.brainx.intelligence.chat.domain;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

public record ChatTokenUsage(
    int inputTokens,
    int cachedInputTokens,
    int billableInputTokens,
    int outputTokens,
    int reasoningTokens,
    int totalTokens,
    BigDecimal estimatedInputCost,
    BigDecimal estimatedCachedInputCost,
    BigDecimal estimatedOutputCost,
    BigDecimal estimatedCost,
    String costCurrency
) {

    public Map<String, Object> toMap() {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("inputTokens", inputTokens);
        values.put("cachedInputTokens", cachedInputTokens);
        values.put("billableInputTokens", billableInputTokens);
        values.put("outputTokens", outputTokens);
        values.put("reasoningTokens", reasoningTokens);
        values.put("totalTokens", totalTokens);
        values.put("estimatedInputCost", estimatedInputCost);
        values.put("estimatedCachedInputCost", estimatedCachedInputCost);
        values.put("estimatedOutputCost", estimatedOutputCost);
        values.put("estimatedCost", estimatedCost);
        values.put("costCurrency", costCurrency);
        return values;
    }
}
