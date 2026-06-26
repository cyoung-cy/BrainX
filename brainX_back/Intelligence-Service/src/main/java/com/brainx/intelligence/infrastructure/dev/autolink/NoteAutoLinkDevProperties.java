package com.brainx.intelligence.infrastructure.dev.autolink;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import com.brainx.intelligence.autolink.domain.NoteAutoLinkStrategy;
import com.brainx.intelligence.shared.domain.DocumentGroups;

@Component
@ConfigurationProperties(prefix = "brainx.dev.note-auto-link")
public class NoteAutoLinkDevProperties {

    private boolean enabled;
    private String command = "analyze";
    private NoteAutoLinkStrategy strategy = NoteAutoLinkStrategy.COMPARE;
    private String userId = "sample-user";
    private String documentGroupId = DocumentGroups.DEFAULT_DOCUMENT_GROUP_ID;
    private int maxNotes;
    private String modelId = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getCommand() {
        return command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public NoteAutoLinkStrategy getStrategy() {
        return strategy == null ? NoteAutoLinkStrategy.COMPARE : strategy;
    }

    public void setStrategy(NoteAutoLinkStrategy strategy) {
        this.strategy = strategy == null ? NoteAutoLinkStrategy.COMPARE : strategy;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getDocumentGroupId() {
        return DocumentGroups.normalize(documentGroupId);
    }

    public void setDocumentGroupId(String documentGroupId) {
        this.documentGroupId = DocumentGroups.normalize(documentGroupId);
    }

    public int getMaxNotes() {
        return maxNotes;
    }

    public void setMaxNotes(int maxNotes) {
        this.maxNotes = Math.max(0, maxNotes);
    }

    public String getModelId() {
        return modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }
}
