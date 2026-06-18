package com.brainx.intelligence.settings.application.usecase;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.settings.application.port.inbound.GetStyleProfileUseCase;
import com.brainx.intelligence.settings.application.port.inbound.ListAiModelsUseCase;
import com.brainx.intelligence.settings.application.port.inbound.PutAiModelSettingsUseCase;
import com.brainx.intelligence.settings.application.port.inbound.PutStyleProfileUseCase;
import com.brainx.intelligence.settings.application.port.outbound.AiModelCatalogPort;
import com.brainx.intelligence.settings.application.port.outbound.AiModelSettingsPort;
import com.brainx.intelligence.settings.application.port.outbound.StyleProfilePort;
import com.brainx.intelligence.settings.domain.AiModel;
import com.brainx.intelligence.settings.domain.AiModelSettings;
import com.brainx.intelligence.settings.domain.SettingsValidation;
import com.brainx.intelligence.settings.domain.StyleProfile;
import com.brainx.intelligence.settings.domain.UnknownAiModelException;

/**
 * AI 사용 준비 기능의 application service입니다.
 */
@Service
@Transactional
public class AiSettingsService implements
    ListAiModelsUseCase,
    PutAiModelSettingsUseCase,
    GetStyleProfileUseCase,
    PutStyleProfileUseCase {

    private final AiModelCatalogPort aiModelCatalogPort;
    private final AiModelSettingsPort aiModelSettingsPort;
    private final StyleProfilePort styleProfilePort;

    public AiSettingsService(
        AiModelCatalogPort aiModelCatalogPort,
        AiModelSettingsPort aiModelSettingsPort,
        StyleProfilePort styleProfilePort
    ) {
        this.aiModelCatalogPort = aiModelCatalogPort;
        this.aiModelSettingsPort = aiModelSettingsPort;
        this.styleProfilePort = styleProfilePort;
    }

    @Override
    @Transactional(readOnly = true)
    public AiModelsResult listAiModels() {
        List<AiModel> models = aiModelCatalogPort.findAll();
        List<AiModelView> modelViews = models.stream()
            .map(model -> new AiModelView(
                model.modelId(),
                model.name(),
                model.provider(),
                model.costPer1kTokens()
            ))
            .toList();
        List<String> enabledModels = models.stream()
            .map(AiModel::modelId)
            .toList();

        return new AiModelsResult(modelViews, enabledModels, Map.of());
    }

    @Override
    public AiModelSettingsResult putAiModelSettings(PutAiModelSettingsCommand command) {
        String userId = SettingsValidation.requireText(command.userId(), "userId");
        String defaultModelId = SettingsValidation.requireText(command.defaultModelId(), "defaultModelId");
        if (!aiModelCatalogPort.existsByModelId(defaultModelId)) {
            throw new UnknownAiModelException(defaultModelId);
        }

        AiModelSettings savedSettings = aiModelSettingsPort.save(
            new AiModelSettings(userId, defaultModelId, command.userApiKeys())
        );

        return new AiModelSettingsResult(settingsMap(savedSettings));
    }

    @Override
    @Transactional(readOnly = true)
    public GetStyleProfileUseCase.StyleProfileResult getStyleProfile(GetStyleProfileQuery query) {
        String userId = SettingsValidation.requireText(query.userId(), "userId");
        StyleProfile styleProfile = styleProfilePort.findStyleProfileByUserId(userId)
            .orElseGet(() -> StyleProfile.empty(userId));

        return new GetStyleProfileUseCase.StyleProfileResult(
            styleProfile.style(),
            styleProfile.detectedFromNotesAt()
        );
    }

    @Override
    public PutStyleProfileUseCase.StyleProfileResult putStyleProfile(PutStyleProfileCommand command) {
        String userId = SettingsValidation.requireText(command.userId(), "userId");
        StyleProfile savedProfile = styleProfilePort.save(new StyleProfile(userId, command.style(), null));

        return new PutStyleProfileUseCase.StyleProfileResult(
            savedProfile.style(),
            savedProfile.detectedFromNotesAt()
        );
    }

    private static Map<String, Object> settingsMap(AiModelSettings settings) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("defaultModelId", settings.defaultModelId());
        values.put("userApiKeys", settings.userApiKeys());
        return Map.copyOf(values);
    }
}
