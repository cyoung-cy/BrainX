package com.brainx.intelligence.exploration.domain;

public enum SearchScope {
    DOCUMENT_GROUP,
    USER;

    public static SearchScope normalize(String value) {
        if (value == null || value.isBlank()) {
            return DOCUMENT_GROUP;
        }
        try {
            return SearchScope.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new ExplorationDomainException("Unsupported search scope: " + value);
        }
    }
}
