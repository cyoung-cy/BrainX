package com.brainx.intelligence.chat.application.usecase;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "brainx.chat.rag")
public class ChatProperties {

    private int topK = 8;
    private double minScore = 0.35d;
    private int maxChunksPerNote = 2;
    private int maxContextChars = 8_000;

    public int getTopK() {
        return topK;
    }

    public void setTopK(int topK) {
        this.topK = Math.max(1, topK);
    }

    public double getMinScore() {
        return minScore;
    }

    public void setMinScore(double minScore) {
        this.minScore = Math.max(0.0d, minScore);
    }

    public int getMaxChunksPerNote() {
        return maxChunksPerNote;
    }

    public void setMaxChunksPerNote(int maxChunksPerNote) {
        this.maxChunksPerNote = Math.max(1, maxChunksPerNote);
    }

    public int getMaxContextChars() {
        return maxContextChars;
    }

    public void setMaxContextChars(int maxContextChars) {
        this.maxContextChars = Math.max(1_000, maxContextChars);
    }
}
