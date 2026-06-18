package com.brainx.intelligence.settings.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.settings.application.port.inbound.GetStyleProfileUseCase.GetStyleProfileQuery;
import com.brainx.intelligence.settings.application.port.inbound.PutAiModelSettingsUseCase.PutAiModelSettingsCommand;
import com.brainx.intelligence.settings.application.port.inbound.PutStyleProfileUseCase.PutStyleProfileCommand;
import com.brainx.intelligence.settings.application.port.outbound.AiModelCatalogPort;
import com.brainx.intelligence.settings.application.port.outbound.AiModelSettingsPort;
import com.brainx.intelligence.settings.application.port.outbound.StyleProfilePort;
import com.brainx.intelligence.settings.domain.AiModel;
import com.brainx.intelligence.settings.domain.AiModelSettings;
import com.brainx.intelligence.settings.domain.StyleProfile;
import com.brainx.intelligence.settings.domain.UnknownAiModelException;

class AiSettingsServiceTest {

    private final InMemorySettingsPorts ports = new InMemorySettingsPorts();
    private final AiSettingsService service = new AiSettingsService(ports, ports, ports);

    @Test
    void listAiModelsReturnsEmptyCatalog() {
        var result = service.listAiModels();

        assertThat(result.models()).isEmpty();
        assertThat(result.enabledModels()).isEmpty();
        assertThat(result.costInfo()).isEmpty();
    }

    @Test
    void listAiModelsReturnsModelsAndEnabledModelIds() {
        ports.addModel(new AiModel("gpt-4o-mini", "GPT-4o mini", "openai", new BigDecimal("0.150000")));
        ports.addModel(new AiModel("gpt-4o", "GPT-4o", "openai", new BigDecimal("2.500000")));

        var result = service.listAiModels();

        assertThat(result.models())
            .extracting("modelId")
            .containsExactly("gpt-4o-mini", "gpt-4o");
        assertThat(result.enabledModels()).containsExactly("gpt-4o-mini", "gpt-4o");
    }

    @Test
    void putAiModelSettingsSavesExistingDefaultModel() {
        ports.addModel(new AiModel("gpt-4o-mini", "GPT-4o mini", "openai", null));

        var result = service.putAiModelSettings(new PutAiModelSettingsCommand(
            "user-1",
            "gpt-4o-mini",
            Map.of("openai", Map.of("masked", true))
        ));

        assertThat(result.settings()).containsEntry("defaultModelId", "gpt-4o-mini");
        assertThat(ports.findSettingsByUserId("user-1"))
            .get()
            .extracting(AiModelSettings::defaultModelId)
            .isEqualTo("gpt-4o-mini");
    }

    @Test
    void putAiModelSettingsFailsForUnknownDefaultModel() {
        assertThatThrownBy(() -> service.putAiModelSettings(new PutAiModelSettingsCommand(
            "user-1",
            "missing-model",
            Map.of()
        )))
            .isInstanceOf(UnknownAiModelException.class)
            .hasMessageContaining("missing-model");
    }

    @Test
    void putAndGetStyleProfile() {
        var putResult = service.putStyleProfile(new PutStyleProfileCommand(
            "user-1",
            Map.of("tone", "concise", "language", "ko")
        ));

        assertThat(putResult.style()).containsEntry("tone", "concise");
        assertThat(putResult.detectedFromNotesAt()).isNull();

        var getResult = service.getStyleProfile(new GetStyleProfileQuery("user-1"));

        assertThat(getResult.style()).containsEntry("language", "ko");
        assertThat(getResult.detectedFromNotesAt()).isNull();
    }

    @Test
    void getStyleProfileReturnsEmptyProfileWhenMissing() {
        var result = service.getStyleProfile(new GetStyleProfileQuery("user-1"));

        assertThat(result.style()).isEmpty();
        assertThat(result.detectedFromNotesAt()).isNull();
    }

    private static final class InMemorySettingsPorts
        implements AiModelCatalogPort, AiModelSettingsPort, StyleProfilePort {

        private final List<AiModel> models = new ArrayList<>();
        private final Map<String, AiModelSettings> settingsByUserId = new LinkedHashMap<>();
        private final Map<String, StyleProfile> styleProfilesByUserId = new LinkedHashMap<>();

        void addModel(AiModel model) {
            models.add(model);
        }

        @Override
        public List<AiModel> findAll() {
            return List.copyOf(models);
        }

        @Override
        public boolean existsByModelId(String modelId) {
            return models.stream().anyMatch(model -> model.modelId().equals(modelId));
        }

        @Override
        public AiModelSettings save(AiModelSettings settings) {
            settingsByUserId.put(settings.userId(), settings);
            return settings;
        }

        @Override
        public Optional<AiModelSettings> findSettingsByUserId(String userId) {
            return Optional.ofNullable(settingsByUserId.get(userId));
        }

        @Override
        public StyleProfile save(StyleProfile styleProfile) {
            styleProfilesByUserId.put(styleProfile.userId(), styleProfile);
            return styleProfile;
        }

        @Override
        public Optional<StyleProfile> findStyleProfileByUserId(String userId) {
            return Optional.ofNullable(styleProfilesByUserId.get(userId));
        }
    }
}
