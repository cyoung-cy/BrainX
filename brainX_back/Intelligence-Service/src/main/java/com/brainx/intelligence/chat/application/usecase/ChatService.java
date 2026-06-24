package com.brainx.intelligence.chat.application.usecase;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.brainx.intelligence.chat.application.port.inbound.CreateChatThreadUseCase;
import com.brainx.intelligence.chat.application.port.inbound.CreateChatThreadUseCase.ChatThreadResult;
import com.brainx.intelligence.chat.application.port.inbound.CreateChatThreadUseCase.CreateChatThreadCommand;
import com.brainx.intelligence.chat.application.port.inbound.GetChatThreadUseCase;
import com.brainx.intelligence.chat.application.port.inbound.GetChatThreadUseCase.ChatThreadDetailResult;
import com.brainx.intelligence.chat.application.port.inbound.GetChatThreadUseCase.GetChatThreadQuery;
import com.brainx.intelligence.chat.application.port.inbound.GetChatThreadUseCase.ThreadView;
import com.brainx.intelligence.chat.application.port.inbound.SendChatMessageUseCase;
import com.brainx.intelligence.chat.application.port.inbound.SendChatMessageUseCase.ChatStreamEvent;
import com.brainx.intelligence.chat.application.port.inbound.SendChatMessageUseCase.SendChatMessageCommand;
import com.brainx.intelligence.chat.application.port.outbound.ChatEventPort;
import com.brainx.intelligence.chat.application.port.outbound.ChatEventPort.ChatMessageCreatedEvent;
import com.brainx.intelligence.chat.application.port.outbound.ChatEventPort.ChatThreadCreatedEvent;
import com.brainx.intelligence.chat.application.port.outbound.ChatPersistencePort;
import com.brainx.intelligence.chat.domain.ChatCitation;
import com.brainx.intelligence.chat.domain.ChatDomainException;
import com.brainx.intelligence.chat.domain.ChatMessage;
import com.brainx.intelligence.chat.domain.ChatRole;
import com.brainx.intelligence.chat.domain.ChatThread;
import com.brainx.intelligence.chat.domain.ChatTokenUsage;
import com.brainx.intelligence.exploration.application.port.outbound.NoteChunkRetrievalPort;
import com.brainx.intelligence.exploration.application.port.outbound.NoteChunkRetrievalPort.NoteChunkSearchQuery;
import com.brainx.intelligence.exploration.domain.NoteChunkSearchResult;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatMessage;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatRequest;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiRole;
import com.brainx.intelligence.shared.application.port.outbound.EntitlementPort;
import com.brainx.intelligence.shared.application.port.outbound.EntitlementPort.EntitlementRequest;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort.TokenUsageRecord;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator.TokenCostEstimate;
import com.brainx.intelligence.shared.domain.DocumentGroups;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ChatService implements CreateChatThreadUseCase, SendChatMessageUseCase, GetChatThreadUseCase {

    static final String RAG_CHAT_CAPABILITY = "RAG_CHAT";
    static final String RAG_CHAT_FEATURE_ID = "rag-chat";
    private static final String SOURCE_SERVICE = "AI-Service";
    private static final String NO_CONTEXT_ANSWER = "관련 노트 근거를 찾지 못했습니다.";
    private static final int HISTORY_LIMIT = 8;
    private static final int CONTEXT_SNIPPET_LENGTH = 1_200;

    private final ChatProperties properties;
    private final ChatPersistencePort chatPersistencePort;
    private final NoteChunkRetrievalPort noteChunkRetrievalPort;
    private final EntitlementPort entitlementPort;
    private final AiChatPort aiChatPort;
    private final TokenUsagePort tokenUsagePort;
    private final AiTokenUsageCostEstimator usageCostEstimator;
    private final ChatEventPort chatEventPort;

    public ChatService(
        ChatProperties properties,
        ChatPersistencePort chatPersistencePort,
        NoteChunkRetrievalPort noteChunkRetrievalPort,
        EntitlementPort entitlementPort,
        AiChatPort aiChatPort,
        TokenUsagePort tokenUsagePort,
        AiTokenUsageCostEstimator usageCostEstimator,
        ChatEventPort chatEventPort
    ) {
        this.properties = properties;
        this.chatPersistencePort = chatPersistencePort;
        this.noteChunkRetrievalPort = noteChunkRetrievalPort;
        this.entitlementPort = entitlementPort;
        this.aiChatPort = aiChatPort;
        this.tokenUsagePort = tokenUsagePort;
        this.usageCostEstimator = usageCostEstimator;
        this.chatEventPort = chatEventPort;
    }

    @Override
    public ChatThreadResult createChatThread(CreateChatThreadCommand command) {
        String userId = requireText(command.userId(), "userId");
        String title = requireText(command.title(), "title");
        String modelId = requireText(command.modelId(), "modelId");
        String documentGroupId = DocumentGroups.normalize(command.documentGroupId());
        ChatThread thread = chatPersistencePort.saveThread(new ChatThread(
            UUID.randomUUID().toString(),
            userId,
            documentGroupId,
            title,
            modelId,
            Instant.now()
        ));
        chatEventPort.chatThreadCreated(new ChatThreadCreatedEvent(
            thread.userId(),
            thread.threadId(),
            thread.documentGroupId(),
            thread.modelId(),
            thread.title()
        ));
        return toThreadResult(thread);
    }

    @Override
    public Flux<ChatStreamEvent> sendChatMessage(SendChatMessageCommand command) {
        String userId = requireText(command.userId(), "userId");
        String threadId = requireText(command.threadId(), "threadId");
        String message = requireText(command.message(), "message");
        String modelId = requireText(command.modelId(), "modelId");
        ChatThread thread = chatPersistencePort.findThreadByUserIdAndThreadId(userId, threadId)
            .orElseThrow(() -> new ChatDomainException("Chat thread not found: " + threadId));
        validateNoteScope(thread, command.noteScope());
        Map<String, Object> noteScope = command.noteScope() == null ? Map.of() : command.noteScope();

        ChatMessage userMessage = chatPersistencePort.saveMessage(ChatMessage.user(
            UUID.randomUUID().toString(),
            thread.threadId(),
            userId,
            message,
            modelId,
            noteScope,
            command.clientContext(),
            Instant.now()
        ));
        List<ChatMessage> history = chatPersistencePort.findMessagesByUserIdAndThreadId(userId, threadId).stream()
            .filter(messageItem -> !messageItem.messageId().equals(userMessage.messageId()))
            .toList();
        String clientContextPrompt = clientContextPrompt(command.clientContext());
        boolean hasClientContext = StringUtils.hasText(clientContextPrompt);
        List<RagContext> contexts = hasClientContext ? List.of() : retrieveContexts(thread, message);
        String systemPrompt = systemPrompt();
        String userPrompt = hasClientContext
            ? userPromptFromClientContext(message, clientContextPrompt)
            : userPrompt(message, contexts);
        int tokenEstimate = estimateTokens(systemPrompt + "\n" + historyPrompt(history) + "\n" + userPrompt);
        var entitlement = entitlementPort.checkEntitlement(new EntitlementRequest(
            userId,
            RAG_CHAT_CAPABILITY,
            tokenEstimate
        ));
        if (!entitlement.allowed()) {
            throw new ChatDomainException("AI capability is not available: " + entitlement.reasonCode());
        }

        if (!hasClientContext && contexts.isEmpty()) {
            return noContextStream(thread, userMessage, modelId, NO_CONTEXT_ANSWER);
        }
        return aiStream(thread, userMessage, modelId, systemPrompt, history, userPrompt, contexts);
    }

    @Override
    public ChatThreadDetailResult getChatThread(GetChatThreadQuery query) {
        String userId = requireText(query.userId(), "userId");
        String threadId = requireText(query.threadId(), "threadId");
        ChatThread thread = chatPersistencePort.findThreadByUserIdAndThreadId(userId, threadId)
            .orElseThrow(() -> new ChatDomainException("Chat thread not found: " + threadId));
        List<Map<String, Object>> messages = chatPersistencePort.findMessagesByUserIdAndThreadId(userId, threadId).stream()
            .map(ChatService::messageMap)
            .toList();
        return new ChatThreadDetailResult(toThreadView(thread), messages);
    }

    private Flux<ChatStreamEvent> noContextStream(
        ChatThread thread,
        ChatMessage userMessage,
        String modelId,
        String answer
    ) {
        String assistantMessageId = UUID.randomUUID().toString();
        ChatTokenUsage tokenUsage = estimatedUsage(modelId, userMessage.content(), answer);
        ChatMessage assistantMessage = saveAssistantMessage(
            thread,
            assistantMessageId,
            answer,
            modelId,
            List.of(),
            tokenUsage
        );
        publishMessageSideEffects(thread, assistantMessage, tokenUsage);
        return Flux.just(ChatStreamEvent.delta(answer), ChatStreamEvent.done(assistantMessageId));
    }

    private Flux<ChatStreamEvent> aiStream(
        ChatThread thread,
        ChatMessage userMessage,
        String modelId,
        String systemPrompt,
        List<ChatMessage> history,
        String userPrompt,
        List<RagContext> contexts
    ) {
        String assistantMessageId = UUID.randomUUID().toString();
        StringBuilder answer = new StringBuilder();
        List<AiChatMessage> promptMessages = promptMessages(systemPrompt, history, userPrompt);

        return aiChatPort.stream(new AiChatRequest(modelId, promptMessages))
            .filter(chunk -> !chunk.done())
            .map(chunk -> {
                String delta = chunk.delta() == null ? "" : chunk.delta();
                answer.append(delta);
                return ChatStreamEvent.delta(delta);
            })
            .concatWith(Mono.fromSupplier(() -> {
                ChatTokenUsage tokenUsage = estimatedUsage(
                    modelId,
                    systemPrompt + "\n" + historyPrompt(history) + "\n" + userPrompt,
                    answer.toString()
                );
                ChatMessage assistantMessage = saveAssistantMessage(
                    thread,
                    assistantMessageId,
                    answer.toString(),
                    modelId,
                    contexts.stream().map(RagContext::citation).toList(),
                    tokenUsage
                );
                publishMessageSideEffects(thread, assistantMessage, tokenUsage);
                return ChatStreamEvent.done(assistantMessageId);
            }))
            .onErrorResume(exception -> Flux.just(ChatStreamEvent.error("STREAM_ERROR", safeMessage(exception))));
    }

    private ChatMessage saveAssistantMessage(
        ChatThread thread,
        String assistantMessageId,
        String answer,
        String modelId,
        List<ChatCitation> citations,
        ChatTokenUsage tokenUsage
    ) {
        return chatPersistencePort.saveMessage(ChatMessage.assistant(
            assistantMessageId,
            thread.threadId(),
            thread.userId(),
            StringUtils.hasText(answer) ? answer : "(empty)",
            modelId,
            citations,
            tokenUsage,
            Instant.now()
        ));
    }

    private void publishMessageSideEffects(ChatThread thread, ChatMessage assistantMessage, ChatTokenUsage tokenUsage) {
        chatEventPort.chatMessageCreated(new ChatMessageCreatedEvent(
            thread.userId(),
            thread.threadId(),
            assistantMessage.messageId(),
            thread.documentGroupId(),
            assistantMessage.modelId(),
            tokenUsage.inputTokens(),
            tokenUsage.outputTokens(),
            assistantMessage.citations().stream()
                .map(ChatCitation::noteId)
                .distinct()
                .toList()
        ));
        tokenUsagePort.recordTokenUsage(new TokenUsageRecord(
            UUID.randomUUID().toString(),
            thread.userId(),
            SOURCE_SERVICE,
            RAG_CHAT_FEATURE_ID,
            assistantMessage.modelId(),
            tokenUsage.inputTokens(),
            tokenUsage.cachedInputTokens(),
            tokenUsage.billableInputTokens(),
            tokenUsage.outputTokens(),
            tokenUsage.reasoningTokens(),
            tokenUsage.totalTokens(),
            tokenUsage.estimatedInputCost(),
            tokenUsage.estimatedCachedInputCost(),
            tokenUsage.estimatedOutputCost(),
            tokenUsage.estimatedCost(),
            tokenUsage.costCurrency(),
            assistantMessage.messageId()
        ));
    }

    private List<RagContext> retrieveContexts(ChatThread thread, String message) {
        return noteChunkRetrievalPort.searchChunks(new NoteChunkSearchQuery(
                thread.userId(),
                thread.documentGroupId(),
                message,
                retrievalTopK()
            )).stream()
            .filter(result -> result.score() >= properties.getMinScore())
            .sorted(Comparator.comparingDouble(NoteChunkSearchResult::score).reversed())
            .map(ChatService::toContext)
            .filter(new PerNoteChunkLimit(properties.getMaxChunksPerNote())::allow)
            .limit(contextLimit())
            .toList();
    }

    private static RagContext toContext(NoteChunkSearchResult result) {
        return new RagContext(
            new ChatCitation(
                result.noteId(),
                result.documentGroupId(),
                result.chunkId(),
                result.chunkIndex(),
                result.title(),
                result.sourcePath(),
                result.sourceFilename(),
                result.score()
            ),
            snippet(result.text())
        );
    }

    private static String snippet(String text) {
        if (text == null || text.length() <= CONTEXT_SNIPPET_LENGTH) {
            return text == null ? "" : text;
        }
        return text.substring(0, CONTEXT_SNIPPET_LENGTH).trim();
    }

    private static String systemPrompt() {
        return """
            You are BrainX RAG chat assistant.
            Answer in Korean using only the provided note context and recent chat history.
            If the context does not contain enough evidence, say that you do not know.
            Keep the answer concise and mention the cited note titles naturally when useful.
            """;
    }

    private String userPrompt(String message, List<RagContext> contexts) {
        StringBuilder builder = new StringBuilder();
        builder.append("Question:\n").append(message).append("\n\nNote context:\n");
        int remainingChars = properties.getMaxContextChars();
        for (int index = 0; index < contexts.size() && remainingChars > 0; index++) {
            RagContext context = contexts.get(index);
            ChatCitation citation = context.citation();
            String header = "[" + (index + 1) + "] title=" + citation.title()
                + ", noteId=" + citation.noteId()
                + ", chunkIndex=" + citation.chunkIndex()
                + sourceLabel(citation)
                + ", score=" + citation.score()
                + "\n";
            String text = context.text();
            int allowed = Math.max(0, remainingChars - header.length() - 2);
            if (text.length() > allowed) {
                text = text.substring(0, allowed).trim();
            }
            builder.append(header).append(text).append("\n\n");
            remainingChars -= header.length() + text.length() + 2;
        }
        return builder.toString();
    }

    private static String userPromptFromClientContext(String message, String clientContextPrompt) {
        return "Question:\n" + message + "\n\nFrontend selected context:\n" + clientContextPrompt;
    }

    private static String clientContextPrompt(Map<String, Object> clientContext) {
        if (clientContext == null || clientContext.isEmpty()) {
            return "";
        }
        Object itemsValue = clientContext.get("items");
        if (!(itemsValue instanceof List<?> items) || items.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        Object mode = clientContext.get("mode");
        Object source = clientContext.get("source");
        builder.append("mode=").append(mode == null ? "UNKNOWN" : mode)
            .append(", source=").append(source == null ? "UNKNOWN" : source)
            .append('\n');

        int index = 1;
        for (Object itemValue : items) {
            if (!(itemValue instanceof Map<?, ?> item)) {
                continue;
            }
            String text = stringValue(item.get("text"));
            if (!StringUtils.hasText(text)) {
                continue;
            }
            builder.append('[').append(index).append("] type=").append(stringValue(item.get("type")));
            String noteId = stringValue(item.get("noteId"));
            if (StringUtils.hasText(noteId)) {
                builder.append(", noteId=").append(noteId);
            }
            String documentGroupId = stringValue(item.get("documentGroupId"));
            if (StringUtils.hasText(documentGroupId)) {
                builder.append(", documentGroupId=").append(documentGroupId);
            }
            if (Boolean.TRUE.equals(item.get("truncated"))) {
                builder.append(", truncated=true");
            }
            builder.append('\n').append(text).append("\n\n");
            index += 1;
        }
        return index == 1 ? "" : builder.toString().trim();
    }

    private static List<AiChatMessage> promptMessages(
        String systemPrompt,
        List<ChatMessage> history,
        String userPrompt
    ) {
        List<AiChatMessage> messages = new java.util.ArrayList<>();
        messages.add(new AiChatMessage(AiRole.SYSTEM, systemPrompt));
        recentHistory(history).forEach(message -> messages.add(new AiChatMessage(
            message.role() == ChatRole.ASSISTANT ? AiRole.ASSISTANT : AiRole.USER,
            message.content()
        )));
        messages.add(new AiChatMessage(AiRole.USER, userPrompt));
        return List.copyOf(messages);
    }

    private static List<ChatMessage> recentHistory(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return List.of();
        }
        int fromIndex = Math.max(0, messages.size() - HISTORY_LIMIT);
        return messages.subList(fromIndex, messages.size());
    }

    private static String historyPrompt(List<ChatMessage> history) {
        StringBuilder builder = new StringBuilder();
        for (ChatMessage message : recentHistory(history)) {
            builder.append(message.role().name()).append(": ").append(message.content()).append('\n');
        }
        return builder.toString();
    }

    private ChatTokenUsage estimatedUsage(String modelId, String prompt, String answer) {
        int inputTokens = estimateTokens(prompt);
        int outputTokens = estimateTokens(answer);
        TokenCostEstimate cost = usageCostEstimator.estimate(modelId, inputTokens, 0, outputTokens);
        return new ChatTokenUsage(
            inputTokens,
            0,
            inputTokens,
            outputTokens,
            0,
            inputTokens + outputTokens,
            cost.inputCost(),
            cost.cachedInputCost(),
            cost.outputCost(),
            cost.totalCost(),
            cost.currencyCode()
        );
    }

    private int contextLimit() {
        return NoteChunkSearchQuery.normalizeTopK(properties.getTopK());
    }

    private int retrievalTopK() {
        return NoteChunkSearchQuery.normalizeTopK(contextLimit() * properties.getMaxChunksPerNote());
    }

    private static void validateNoteScope(ChatThread thread, Map<String, Object> noteScope) {
        if (noteScope == null || !noteScope.containsKey("documentGroupId")) {
            return;
        }
        Object value = noteScope.get("documentGroupId");
        String scopedDocumentGroupId = DocumentGroups.normalize(value == null ? null : value.toString());
        if (!thread.documentGroupId().equals(scopedDocumentGroupId)) {
            throw new ChatDomainException("noteScope.documentGroupId must match thread documentGroupId.");
        }
    }

    private static Map<String, Object> messageMap(ChatMessage message) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("messageId", message.messageId());
        values.put("threadId", message.threadId());
        values.put("role", message.role().name());
        values.put("content", message.content());
        values.put("modelId", message.modelId());
        values.put("noteScope", message.noteScope());
        values.put("clientContext", message.clientContext());
        values.put("citations", message.citations().stream().map(ChatCitation::toMap).toList());
        values.put("tokenUsage", message.tokenUsage() == null ? null : message.tokenUsage().toMap());
        values.put("createdAt", message.createdAt());
        return values;
    }

    private static ChatThreadResult toThreadResult(ChatThread thread) {
        return new ChatThreadResult(
            thread.threadId(),
            thread.documentGroupId(),
            thread.title(),
            thread.modelId(),
            thread.createdAt()
        );
    }

    private static ThreadView toThreadView(ChatThread thread) {
        return new ThreadView(
            thread.threadId(),
            thread.documentGroupId(),
            thread.title(),
            thread.modelId(),
            thread.createdAt()
        );
    }

    private static String sourceLabel(ChatCitation citation) {
        if (StringUtils.hasText(citation.sourcePath())) {
            return ", sourcePath=" + citation.sourcePath();
        }
        if (StringUtils.hasText(citation.sourceFilename())) {
            return ", sourceFilename=" + citation.sourceFilename();
        }
        return "";
    }

    private static String requireText(String value, String name) {
        if (!StringUtils.hasText(value)) {
            throw new ChatDomainException(name + " must not be blank.");
        }
        return value.trim();
    }

    private static String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private static int estimateTokens(String text) {
        String safeText = text == null ? "" : text;
        return Math.max(1, (int) Math.ceil(safeText.length() / 4.0d));
    }

    private static String safeMessage(Throwable exception) {
        String message = exception.getMessage();
        return message == null || message.isBlank() ? "RAG chat stream failed." : message;
    }

    private record RagContext(ChatCitation citation, String text) {
    }

    private static final class PerNoteChunkLimit {

        private final int maxChunksPerNote;
        private final Map<String, Integer> counts = new LinkedHashMap<>();

        private PerNoteChunkLimit(int maxChunksPerNote) {
            this.maxChunksPerNote = Math.max(1, maxChunksPerNote);
        }

        private boolean allow(RagContext context) {
            String noteId = context.citation().noteId();
            int current = counts.getOrDefault(noteId, 0);
            if (current >= maxChunksPerNote) {
                return false;
            }
            counts.put(noteId, current + 1);
            return true;
        }
    }
}
