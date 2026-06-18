package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import java.time.Instant;
import java.util.Map;

import com.brainx.intelligence.infrastructure.persistence.jpa.JsonMapAttributeConverter;
import com.brainx.intelligence.settings.domain.StyleProfile;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_style_profiles")
public class StyleProfileJpaEntity {

    @Id
    @Column(name = "user_id", nullable = false, length = 100)
    private String userId;

    @Lob
    @Column(name = "style", nullable = false)
    @Convert(converter = JsonMapAttributeConverter.class)
    private Map<String, Object> style = Map.of();

    @Column(name = "detected_from_notes_at")
    private Instant detectedFromNotesAt;

    protected StyleProfileJpaEntity() {
    }

    public StyleProfileJpaEntity(
        String userId,
        Map<String, Object> style,
        Instant detectedFromNotesAt
    ) {
        this.userId = userId;
        this.style = style == null ? Map.of() : style;
        this.detectedFromNotesAt = detectedFromNotesAt;
    }

    static StyleProfileJpaEntity fromDomain(StyleProfile styleProfile) {
        return new StyleProfileJpaEntity(
            styleProfile.userId(),
            styleProfile.style(),
            styleProfile.detectedFromNotesAt()
        );
    }

    StyleProfile toDomain() {
        return new StyleProfile(userId, style, detectedFromNotesAt);
    }
}
