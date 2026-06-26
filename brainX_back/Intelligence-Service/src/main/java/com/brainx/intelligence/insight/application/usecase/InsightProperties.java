package com.brainx.intelligence.insight.application.usecase;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConfigurationProperties(prefix = "brainx.insight")
public class InsightProperties {

    private String defaultModel = "gpt-5.4-mini";
    private int maxNotes = 50;
    private int maxRecommendations = 8;

    public String getDefaultModel() {
        return defaultModel;
    }

    public void setDefaultModel(String defaultModel) {
        if (StringUtils.hasText(defaultModel)) {
            this.defaultModel = defaultModel.trim();
        }
    }

    public int getMaxNotes() {
        return Math.max(1, maxNotes);
    }

    public void setMaxNotes(int maxNotes) {
        this.maxNotes = maxNotes;
    }

    public int getMaxRecommendations() {
        return Math.max(1, maxRecommendations);
    }

    public void setMaxRecommendations(int maxRecommendations) {
        this.maxRecommendations = maxRecommendations;
    }
}
