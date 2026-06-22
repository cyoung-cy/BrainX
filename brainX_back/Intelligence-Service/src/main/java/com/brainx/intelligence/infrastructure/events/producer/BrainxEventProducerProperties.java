package com.brainx.intelligence.infrastructure.events.producer;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "brainx.events.producer")
public class BrainxEventProducerProperties {

    private boolean enabled;
    private String semanticSearchPerformedTopic = "brainx.knowledge.intelligence.semantic-search-performed.v1";
    private String tokenUsageRecordedRequestedTopic = "brainx.knowledge.intelligence.token-usage-recorded-requested.v1";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getSemanticSearchPerformedTopic() {
        return semanticSearchPerformedTopic;
    }

    public void setSemanticSearchPerformedTopic(String semanticSearchPerformedTopic) {
        this.semanticSearchPerformedTopic = semanticSearchPerformedTopic;
    }

    public String getTokenUsageRecordedRequestedTopic() {
        return tokenUsageRecordedRequestedTopic;
    }

    public void setTokenUsageRecordedRequestedTopic(String tokenUsageRecordedRequestedTopic) {
        this.tokenUsageRecordedRequestedTopic = tokenUsageRecordedRequestedTopic;
    }
}
