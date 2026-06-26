package com.brainx.intelligence.chat.domain;

public enum ChatRoute {
    NOTE_QA,
    WORKSPACE_SEARCH,
    COMPOSE,
    NOTE_ACTION,
    OUT_OF_SCOPE;

    public static ChatRoute fromValue(String value) {
        if (value == null || value.isBlank()) {
            return OUT_OF_SCOPE;
        }
        try {
            return ChatRoute.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            return OUT_OF_SCOPE;
        }
    }
}
