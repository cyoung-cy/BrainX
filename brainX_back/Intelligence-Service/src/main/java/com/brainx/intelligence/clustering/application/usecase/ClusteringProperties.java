package com.brainx.intelligence.clustering.application.usecase;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConfigurationProperties(prefix = "brainx.clustering")
public class ClusteringProperties {

    private String defaultModel = "gpt-5.4-mini";
    private int maxNotes = 50;
    private int maxClusters = 6;

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

    public int getMaxClusters() {
        return Math.max(1, maxClusters);
    }

    public void setMaxClusters(int maxClusters) {
        this.maxClusters = maxClusters;
    }
}
