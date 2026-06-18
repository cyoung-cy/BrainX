package com.brainx.intelligence.settings.domain;

public final class SettingsValidation {

    private SettingsValidation() {
    }

    public static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new SettingsDomainException(name + " must not be blank.");
        }
        return value;
    }
}
