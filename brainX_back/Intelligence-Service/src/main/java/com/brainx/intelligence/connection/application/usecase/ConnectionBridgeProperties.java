package com.brainx.intelligence.connection.application.usecase;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "brainx.connection.bridge")
public class ConnectionBridgeProperties {

    private String defaultModel = "gpt-5.4-mini";
    private int maxRecommendations = 3;

    public String getDefaultModel() {
        return defaultModel;
    }

    public void setDefaultModel(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public int getMaxRecommendations() {
        return Math.max(1, Math.min(maxRecommendations, 10));
    }

    public void setMaxRecommendations(int maxRecommendations) {
        this.maxRecommendations = maxRecommendations;
    }
}
