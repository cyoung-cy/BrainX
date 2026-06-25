package com.brainx.intelligence.autolink.application.usecase;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "brainx.note-auto-link")
public class NoteAutoLinkProperties {

    private String model = "gpt-5.4-mini";
    private int maxNotes = 50;
    private int vectorTopK = 20;
    private double minVectorScore = 0.35d;
    private int maxSourceWindowsPerNote = 12;
    private int maxSuggestionsPerNote = 5;

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public int getMaxNotes() {
        return Math.max(1, maxNotes);
    }

    public void setMaxNotes(int maxNotes) {
        this.maxNotes = Math.max(1, maxNotes);
    }

    public int getVectorTopK() {
        return Math.max(1, vectorTopK);
    }

    public void setVectorTopK(int vectorTopK) {
        this.vectorTopK = Math.max(1, vectorTopK);
    }

    public double getMinVectorScore() {
        return minVectorScore;
    }

    public void setMinVectorScore(double minVectorScore) {
        if (Double.isNaN(minVectorScore) || Double.isInfinite(minVectorScore)) {
            throw new IllegalArgumentException("minVectorScore must be finite.");
        }
        this.minVectorScore = minVectorScore;
    }

    public int getMaxSourceWindowsPerNote() {
        return Math.max(1, maxSourceWindowsPerNote);
    }

    public void setMaxSourceWindowsPerNote(int maxSourceWindowsPerNote) {
        this.maxSourceWindowsPerNote = Math.max(1, maxSourceWindowsPerNote);
    }

    public int getMaxSuggestionsPerNote() {
        return Math.max(1, maxSuggestionsPerNote);
    }

    public void setMaxSuggestionsPerNote(int maxSuggestionsPerNote) {
        this.maxSuggestionsPerNote = Math.max(1, maxSuggestionsPerNote);
    }
}
