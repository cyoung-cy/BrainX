package com.brainx.intelligence;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.brainx.intelligence.infrastructure.security.SecurityConfig;
import com.brainx.intelligence.infrastructure.web.GlobalApiExceptionHandler;
import com.brainx.intelligence.settings.adapter.web.SettingsController;
import com.brainx.intelligence.settings.application.port.inbound.GetStyleProfileUseCase;
import com.brainx.intelligence.settings.application.port.inbound.ListAiModelsUseCase;
import com.brainx.intelligence.settings.application.port.inbound.ListAiModelsUseCase.AiModelsResult;
import com.brainx.intelligence.settings.application.port.inbound.ListAiModelsUseCase.AiPricingPolicyView;
import com.brainx.intelligence.settings.application.port.inbound.ListAiModelsUseCase.ListAiModelsQuery;
import com.brainx.intelligence.settings.application.port.inbound.PutAiModelSettingsUseCase;
import com.brainx.intelligence.settings.application.port.inbound.PutStyleProfileUseCase;
import com.brainx.intelligence.support.JwtTestTokens;

@WebMvcTest(SettingsController.class)
@Import({SecurityConfig.class, GlobalApiExceptionHandler.class})
@TestPropertySource(properties = "brainx.jwt.secret=test-jwt-secret-for-intelligence-service")
class SettingsControllerDefaultSecurityTest {

    private static final String SECRET = "test-jwt-secret-for-intelligence-service";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ListAiModelsUseCase listAiModelsUseCase;

    @MockitoBean
    private PutAiModelSettingsUseCase putAiModelSettingsUseCase;

    @MockitoBean
    private GetStyleProfileUseCase getStyleProfileUseCase;

    @MockitoBean
    private PutStyleProfileUseCase putStyleProfileUseCase;

    @Test
    void defaultProfileRequiresAuthenticationForApi() throws Exception {
        mockMvc.perform(get("/api/v1/ai/models"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication required."));

        verifyNoInteractions(listAiModelsUseCase);
    }

    @Test
    void defaultProfileAcceptsValidBearerAccessToken() throws Exception {
        when(listAiModelsUseCase.listAiModels(any(ListAiModelsQuery.class)))
            .thenReturn(new AiModelsResult(
                List.of(),
                List.of(),
                new AiPricingPolicyView("TOKEN", "", Map.of())
            ));

        mockMvc.perform(get("/api/v1/ai/models")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + JwtTestTokens.accessToken(SECRET, "usr_jwt")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        verify(listAiModelsUseCase).listAiModels(argThat(query -> query.userId().equals("usr_jwt")));
    }

    @Test
    void defaultProfileRejectsInvalidBearerToken() throws Exception {
        mockMvc.perform(get("/api/v1/ai/models")
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication required."));

        verifyNoInteractions(listAiModelsUseCase);
    }

    @Test
    void defaultProfileRejectsRefreshToken() throws Exception {
        mockMvc.perform(get("/api/v1/ai/models")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + JwtTestTokens.refreshToken(SECRET, "usr_jwt")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Authentication required."));

        verifyNoInteractions(listAiModelsUseCase);
    }
}
