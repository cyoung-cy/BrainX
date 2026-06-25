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
    private double minConfidence = 0.75d;
    private double vectorStrongScore = 0.60d;
    private int minAnchorKoreanChars = 4;
    private int maxSuggestionsPerSourceTarget = 1;
    private int maxSuggestionsPerTargetNote = 5;
    private boolean relationVerifierEnabled = true;
    private double minRelationConfidence = 0.70d;
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

    public double getMinConfidence() {
        return minConfidence;
    }

    public void setMinConfidence(double minConfidence) {
        if (Double.isNaN(minConfidence) || Double.isInfinite(minConfidence)) {
            throw new IllegalArgumentException("minConfidence must be finite.");
        }
        this.minConfidence = Math.max(0.0d, Math.min(1.0d, minConfidence));
    }

    public double getVectorStrongScore() {
        return vectorStrongScore;
    }

    public void setVectorStrongScore(double vectorStrongScore) {
        if (Double.isNaN(vectorStrongScore) || Double.isInfinite(vectorStrongScore)) {
            throw new IllegalArgumentException("vectorStrongScore must be finite.");
        }
        this.vectorStrongScore = vectorStrongScore;
    }

    public int getMinAnchorKoreanChars() {
        return Math.max(1, minAnchorKoreanChars);
    }

    public void setMinAnchorKoreanChars(int minAnchorKoreanChars) {
        this.minAnchorKoreanChars = Math.max(1, minAnchorKoreanChars);
    }

    public int getMaxSuggestionsPerSourceTarget() {
        return Math.max(1, maxSuggestionsPerSourceTarget);
    }

    public void setMaxSuggestionsPerSourceTarget(int maxSuggestionsPerSourceTarget) {
        this.maxSuggestionsPerSourceTarget = Math.max(1, maxSuggestionsPerSourceTarget);
    }

    public int getMaxSuggestionsPerTargetNote() {
        return Math.max(1, maxSuggestionsPerTargetNote);
    }

    public void setMaxSuggestionsPerTargetNote(int maxSuggestionsPerTargetNote) {
        this.maxSuggestionsPerTargetNote = Math.max(1, maxSuggestionsPerTargetNote);
    }

    public boolean isRelationVerifierEnabled() {
        return relationVerifierEnabled;
    }

    public void setRelationVerifierEnabled(boolean relationVerifierEnabled) {
        this.relationVerifierEnabled = relationVerifierEnabled;
    }

    public double getMinRelationConfidence() {
        return minRelationConfidence;
    }

    public void setMinRelationConfidence(double minRelationConfidence) {
        if (Double.isNaN(minRelationConfidence) || Double.isInfinite(minRelationConfidence)) {
            throw new IllegalArgumentException("minRelationConfidence must be finite.");
        }
        this.minRelationConfidence = Math.max(0.0d, Math.min(1.0d, minRelationConfidence));
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
