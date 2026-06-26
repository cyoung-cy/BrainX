package com.brainx.intelligence.infrastructure.dev.chatrouter;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import com.brainx.intelligence.shared.domain.DocumentGroups;

@Component
@ConfigurationProperties(prefix = "brainx.dev.chat-router")
public class ChatRouterDevProperties {

    private boolean enabled;
    private String command = "ask";
    private Path directory = Path.of("sample_notes");
    private String userId = "sample-user";
    private String documentGroupId = DocumentGroups.DEFAULT_DOCUMENT_GROUP_ID;
    private String folderId = "sample_notes";
    private List<String> tags = new ArrayList<>(List.of("sample_notes"));
    private String query = "";
    private String modelId = "gpt-5.4-mini";

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

    public Path getDirectory() {
        return directory;
    }

    public void setDirectory(Path directory) {
        this.directory = directory;
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

    public String getFolderId() {
        return folderId;
    }

    public void setFolderId(String folderId) {
        this.folderId = folderId;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags == null ? new ArrayList<>() : new ArrayList<>(tags);
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getModelId() {
        return modelId;
    }

    public void setModelId(String modelId) {
        this.modelId = modelId;
    }
}
