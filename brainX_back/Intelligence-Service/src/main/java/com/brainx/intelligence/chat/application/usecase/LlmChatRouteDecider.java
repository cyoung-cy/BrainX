package com.brainx.intelligence.chat.application.usecase;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.brainx.intelligence.chat.application.usecase.ChatRouteDecider.ChatRouteRequest;
import com.brainx.intelligence.chat.domain.ChatRoute;
import com.brainx.intelligence.chat.domain.ChatRouteDecision;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatMessage;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatRequest;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiRole;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiTokenUsage;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort.TokenUsageRecord;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator.TokenCostEstimate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class LlmChatRouteDecider implements ChatRouteDecider {

    static final String CHAT_ROUTER_FEATURE_ID = "chat-router-classifier";
    private static final String SOURCE_SERVICE = "Intelligence-Service";

    private final ChatRouterProperties properties;
    private final AiChatPort aiChatPort;
    private final TokenUsagePort tokenUsagePort;
    private final AiTokenUsageCostEstimator usageCostEstimator;
    private final ObjectMapper objectMapper;

    public LlmChatRouteDecider(
        ChatRouterProperties properties,
        AiChatPort aiChatPort,
        TokenUsagePort tokenUsagePort,
        AiTokenUsageCostEstimator usageCostEstimator,
        ObjectMapper objectMapper
    ) {
        this.properties = properties;
        this.aiChatPort = aiChatPort;
        this.tokenUsagePort = tokenUsagePort;
        this.usageCostEstimator = usageCostEstimator;
        this.objectMapper = objectMapper;
    }

    @Override
    public ChatRouteDecision decide(ChatRouteRequest request) {
        String routerModel = properties.getModel();
        if (!properties.isEnabled()) {
            return new ChatRouteDecision(ChatRoute.NOTE_QA, "router disabled", routerModel);
        }
        try {
            AiChatResponseWithPrompt routed = routeWithPrompt(request, routerModel);
            recordTokenUsage(request.userId(), routerModel, routed.response().tokenUsage());
            return parseDecision(routed.response().content(), routerModel);
        } catch (RuntimeException exception) {
            return ChatRouteDecision.outOfScope("router failed", routerModel);
        }
    }

    private AiChatResponseWithPrompt routeWithPrompt(ChatRouteRequest request, String routerModel) {
        var response = aiChatPort.generate(new AiChatRequest(
            routerModel,
            List.of(
                new AiChatMessage(AiRole.SYSTEM, systemPrompt()),
                new AiChatMessage(AiRole.USER, userPrompt(request))
            )
        ));
        return new AiChatResponseWithPrompt(response);
    }

    private ChatRouteDecision parseDecision(String content, String routerModel) {
        if (!StringUtils.hasText(content)) {
            return ChatRouteDecision.outOfScope("empty router response", routerModel);
        }
        try {
            JsonNode root = objectMapper.readTree(content);
            ChatRoute route = ChatRoute.fromValue(root.path("route").asText());
            String reason = root.path("reason").asText("");
            return new ChatRouteDecision(route, reason, routerModel);
        } catch (Exception exception) {
            return ChatRouteDecision.outOfScope("invalid router response", routerModel);
        }
    }

    private void recordTokenUsage(String userId, String modelId, AiTokenUsage tokenUsage) {
        if (tokenUsage == null || !tokenUsage.hasKnownTokens()) {
            return;
        }
        int inputTokens = tokenCount(tokenUsage.promptTokens());
        int cachedInputTokens = tokenCount(tokenUsage.cachedPromptTokens());
        int billableInputTokens = Math.max(0, inputTokens - cachedInputTokens);
        int outputTokens = tokenCount(tokenUsage.completionTokens());
        int reasoningTokens = tokenCount(tokenUsage.reasoningTokens());
        int totalTokens = tokenUsage.totalTokens() == null
            ? inputTokens + outputTokens
            : Math.max(0, tokenUsage.totalTokens());
        TokenCostEstimate cost = usageCostEstimator.estimate(modelId, inputTokens, cachedInputTokens, outputTokens);

        tokenUsagePort.recordTokenUsage(new TokenUsageRecord(
            UUID.randomUUID().toString(),
            userId,
            SOURCE_SERVICE,
            CHAT_ROUTER_FEATURE_ID,
            modelId,
            inputTokens,
            cachedInputTokens,
            billableInputTokens,
            outputTokens,
            reasoningTokens,
            totalTokens,
            cost.inputCost(),
            cost.cachedInputCost(),
            cost.outputCost(),
            cost.totalCost(),
            cost.currencyCode(),
            UUID.randomUUID().toString()
        ));
    }

    private static String systemPrompt() {
        return """
            You are BrainX chat router.
            Return only strict JSON with keys route and reason.
            Allowed routes:
            - NOTE_QA: asks a question that should be answered from the current note/document group context.
            - WORKSPACE_SEARCH: asks to find, search, compare, or summarize information across the user's notes.
            - COMPOSE: asks to write, draft, rewrite, outline, or create content.
            - NOTE_ACTION: asks to save, insert, append, apply, or add generated content to a note. This only produces a draft; no mutation is performed.
            - OUT_OF_SCOPE: weather, news, general web knowledge, coding help, app navigation, account, billing, settings, or anything unrelated to notes/search/writing/note draft application.
            Routing priority:
            - If the message refers to the current note, this note, selected note/text, current document group, current thread, or current document-group notes, choose NOTE_QA unless it asks to save/insert/apply content.
            - Choose WORKSPACE_SEARCH only when the user explicitly asks across all notes, the whole workspace, every note, my entire notes, or user-wide/global note search.
            Examples:
            - "현재 문서 그룹 노트 기준으로 RAG 흐름을 설명해줘" -> NOTE_QA
            - "이 노트에서 토큰 사용량 기록 과정을 설명해줘" -> NOTE_QA
            - "내 전체 노트에서 인증과 토큰 사용량 관련 내용을 찾아 비교해줘" -> WORKSPACE_SEARCH
            Do not answer the user. Classify only.
            """;
    }

    private static String userPrompt(ChatRouteRequest request) {
        Map<String, Object> clientContext = request.clientContext() == null ? Map.of() : request.clientContext();
        Map<String, Object> noteScope = request.noteScope() == null ? Map.of() : request.noteScope();
        return """
            Message:
            %s

            Metadata:
            documentGroupId=%s
            noteScopeKeys=%s
            clientContextSource=%s
            clientContextMode=%s
            clientContextItemCount=%d

            Return JSON only.
            """.formatted(
            request.message(),
            request.documentGroupId(),
            noteScope.keySet(),
            stringValue(clientContext.get("source")),
            stringValue(clientContext.get("mode")),
            itemCount(clientContext.get("items"))
        );
    }

    private static int itemCount(Object items) {
        return items instanceof List<?> list ? list.size() : 0;
    }

    private static String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private static int tokenCount(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private record AiChatResponseWithPrompt(AiChatPort.AiChatResponse response) {
    }
}
