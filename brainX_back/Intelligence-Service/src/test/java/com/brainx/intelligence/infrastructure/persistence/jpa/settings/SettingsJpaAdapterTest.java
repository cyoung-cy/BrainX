package com.brainx.intelligence.infrastructure.persistence.jpa.settings;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.brainx.intelligence.settings.domain.AiModelSettings;
import com.brainx.intelligence.settings.domain.StyleProfile;

@DataJpaTest
@ActiveProfiles("test")
@Import(SettingsJpaAdapter.class)
class SettingsJpaAdapterTest {

    @Autowired
    private SettingsJpaAdapter settingsJpaAdapter;

    @Autowired
    private AiModelJpaRepository aiModelJpaRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findAllReturnsCatalogModelsFromDatabase() {
        aiModelJpaRepository.save(new AiModelJpaEntity(
            "gpt-4o-mini",
            "GPT-4o mini",
            "openai",
            new BigDecimal("0.150000")
        ));
        entityManager.flush();
        entityManager.clear();

        var models = settingsJpaAdapter.findAll();

        assertThat(models).hasSize(1);
        assertThat(models.getFirst().modelId()).isEqualTo("gpt-4o-mini");
        assertThat(settingsJpaAdapter.existsByModelId("gpt-4o-mini")).isTrue();
    }

    @Test
    void saveAndFindAiModelSettingsPreservesJsonMap() {
        settingsJpaAdapter.save(new AiModelSettings(
            "user-1",
            "gpt-4o-mini",
            Map.of(
                "openai", Map.of("masked", true),
                "priority", List.of("chat", "assist")
            )
        ));
        entityManager.flush();
        entityManager.clear();

        var found = settingsJpaAdapter.findSettingsByUserId("user-1").orElseThrow();

        assertThat(found.defaultModelId()).isEqualTo("gpt-4o-mini");
        assertThat(found.userApiKeys()).containsEntry("priority", List.of("chat", "assist"));
        assertThat(found.userApiKeys().get("openai")).isInstanceOf(Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> openAiApiKeyInfo = (Map<String, Object>) found.userApiKeys().get("openai");
        assertThat(openAiApiKeyInfo).containsEntry("masked", true);
    }

    @Test
    void saveAndFindStyleProfilePreservesJsonMap() {
        Instant detectedAt = Instant.parse("2026-06-18T03:00:00Z");
        settingsJpaAdapter.save(new StyleProfile(
            "user-1",
            Map.of(
                "tone", "concise",
                "rules", List.of("ko", "technical")
            ),
            detectedAt
        ));
        entityManager.flush();
        entityManager.clear();

        var found = settingsJpaAdapter.findStyleProfileByUserId("user-1").orElseThrow();

        assertThat(found.style()).containsEntry("tone", "concise");
        assertThat(found.style()).containsEntry("rules", List.of("ko", "technical"));
        assertThat(found.detectedFromNotesAt()).isEqualTo(detectedAt);
    }
}
