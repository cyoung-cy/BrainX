package com.brainx.intelligence.chat.application.usecase;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@ConfigurationProperties(prefix = "brainx.chat.router")
public class ChatRouterProperties {

    private boolean enabled = true;
    private String model = "gpt-5.4-nano";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getModel() {
        return StringUtils.hasText(model) ? model.trim() : "gpt-5.4-nano";
    }

    public void setModel(String model) {
        this.model = model;
    }
}
