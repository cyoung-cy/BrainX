package com.brainx.intelligence.infrastructure.dev.connection;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import com.brainx.intelligence.shared.domain.DocumentGroups;

@Component
@ConfigurationProperties(prefix = "brainx.dev.connection-quality")
public class ConnectionQualityDevProperties {

    private boolean enabled;
    private String command = "run";
    private Path directory = Path.of("sample_notes");
    private String userId = "sample-user";
    private String documentGroupId = DocumentGroups.DEFAULT_DOCUMENT_GROUP_ID;
    private String folderId = "sample_notes";
    private List<String> tags = new ArrayList<>(List.of("sample_notes"));
    private String type = "";
    private String sourcePath = "";
    private String sourceNoteId = "";
    private List<String> notePaths = new ArrayList<>();
    private List<String> noteIds = new ArrayList<>();

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type == null ? "" : type;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public void setSourcePath(String sourcePath) {
        this.sourcePath = sourcePath == null ? "" : sourcePath;
    }

    public String getSourceNoteId() {
        return sourceNoteId;
    }

    public void setSourceNoteId(String sourceNoteId) {
        this.sourceNoteId = sourceNoteId == null ? "" : sourceNoteId;
    }

    public List<String> getNotePaths() {
        return notePaths;
    }

    public void setNotePaths(List<String> notePaths) {
        this.notePaths = notePaths == null ? new ArrayList<>() : new ArrayList<>(notePaths);
    }

    public List<String> getNoteIds() {
        return noteIds;
    }

    public void setNoteIds(List<String> noteIds) {
        this.noteIds = noteIds == null ? new ArrayList<>() : new ArrayList<>(noteIds);
    }
}
