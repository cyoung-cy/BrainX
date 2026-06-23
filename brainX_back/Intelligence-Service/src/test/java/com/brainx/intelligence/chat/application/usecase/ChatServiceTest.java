package com.brainx.intelligence.chat.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.brainx.intelligence.chat.application.port.inbound.CreateChatThreadUseCase.CreateChatThreadCommand;
import com.brainx.intelligence.chat.application.port.inbound.SendChatMessageUseCase.SendChatMessageCommand;
import com.brainx.intelligence.chat.application.port.outbound.ChatEventPort;
import com.brainx.intelligence.chat.application.port.outbound.ChatPersistencePort;
import com.brainx.intelligence.chat.domain.ChatDomainException;
import com.brainx.intelligence.chat.domain.ChatMessage;
import com.brainx.intelligence.chat.domain.ChatRole;
import com.brainx.intelligence.chat.domain.ChatThread;
import com.brainx.intelligence.exploration.application.port.outbound.NoteChunkRetrievalPort;
import com.brainx.intelligence.exploration.domain.NoteChunkSearchResult;
import com.brainx.intelligence.settings.application.port.outbound.AiModelCatalogPort;
import com.brainx.intelligence.settings.domain.AiModel;
import com.brainx.intelligence.settings.domain.VendorTokenCost;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatChunk;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatRequest;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatResponse;
import com.brainx.intelligence.shared.application.port.outbound.EntitlementPort;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator;

import reactor.core.publisher.Flux;

class ChatServiceTest {

    private final ChatProperties properties = new ChatProperties();
    private final FakeChatPersistencePort persistencePort = new FakeChatPersistencePort();
    private final FakeNoteChunkRetrievalPort retrievalPort = new FakeNoteChunkRetrievalPort();
    private final FakeEntitlementPort entitlementPort = new FakeEntitlementPort();
    private final FakeAiChatPort aiChatPort = new FakeAiChatPort();
    private final FakeTokenUsagePort tokenUsagePort = new FakeTokenUsagePort();
    private final FakeAiModelCatalogPort catalogPort = new FakeAiModelCatalogPort();
    private final FakeChatEventPort chatEventPort = new FakeChatEventPort();
    private final ChatService service = new ChatService(
        properties,
        persistencePort,
        retrievalPort,
        entitlementPort,
        aiChatPort,
        tokenUsagePort,
        new AiTokenUsageCostEstimator(catalogPort),
        chatEventPort
    );

    @BeforeEach
    void setUp() {
        catalogPort.model = new AiModel(
            "gpt-test",
            "GPT test",
            "openai",
            new VendorTokenCost(
                new BigDecimal("0.010000"),
                new BigDecimal("0.002000"),
                new BigDecimal("0.030000"),
                "usd"
            )
        );
        aiChatPort.chunks = Flux.just(
            new AiChatChunk("답변 ", false),
            new AiChatChunk("완료", false),
            new AiChatChunk("", true)
        );
    }

    @Test
    void createChatThreadDefaultsDocumentGroupAndPublishesEvent() {
        var result = service.createChatThread(new CreateChatThreadCommand(
            "user-1",
            null,
            "RAG 질문",
            "gpt-test"
        ));

        assertThat(result.documentGroupId()).isEqualTo("default");
        assertThat(result.title()).isEqualTo("RAG 질문");
        assertThat(result.modelId()).isEqualTo("gpt-test");
        assertThat(persistencePort.threads).hasSize(1);
        assertThat(chatEventPort.threadEvents).hasSize(1);
        assertThat(chatEventPort.threadEvents.getFirst().threadId()).isEqualTo(result.threadId());
    }

    @Test
    void sendMessageStreamsDeltasAndPersistsAssistantWithUsageAndCitations() {
        ChatThread thread = existingThread();
        persistencePort.saveThread(thread);
        retrievalPort.results = List.of(
            new NoteChunkSearchResult(
                "user-1",
                "group-1",
                "note-1",
                "note-1::0",
                0,
                "RAG note",
                "context text",
                0.91d,
                "hash",
                1,
                "docs/rag.md",
                "rag.md"
            )
        );

        var events = service.sendChatMessage(new SendChatMessageCommand(
            "user-1",
            thread.threadId(),
            "RAG란?",
            Map.of("documentGroupId", "group-1"),
            "gpt-test"
        )).collectList().block();

        assertThat(events).hasSize(3);
        assertThat(events.get(0).eventName()).isEqualTo("delta");
        assertThat(events.get(0).data()).containsEntry("text", "답변 ");
        assertThat(events.get(1).data()).containsEntry("text", "완료");
        assertThat(events.get(2).eventName()).isEqualTo("done");
        assertThat(retrievalPort.lastQuery.documentGroupId()).isEqualTo("group-1");
        assertThat(entitlementPort.lastRequest.capability()).isEqualTo("RAG_CHAT");
        assertThat(aiChatPort.lastRequest.modelId()).isEqualTo("gpt-test");
        assertThat(aiChatPort.lastRequest.messages().getLast().content())
            .contains("RAG란?")
            .contains("context text")
            .contains("sourcePath=docs/rag.md");

        assertThat(persistencePort.messages).hasSize(2);
        ChatMessage userMessage = persistencePort.messages.get(0);
        ChatMessage assistantMessage = persistencePort.messages.get(1);
        assertThat(userMessage.role()).isEqualTo(ChatRole.USER);
        assertThat(assistantMessage.role()).isEqualTo(ChatRole.ASSISTANT);
        assertThat(assistantMessage.content()).isEqualTo("답변 완료");
        assertThat(assistantMessage.citations()).hasSize(1);
        assertThat(assistantMessage.tokenUsage()).isNotNull();

        assertThat(chatEventPort.messageEvents).hasSize(1);
        assertThat(chatEventPort.messageEvents.getFirst().citationNoteIds()).containsExactly("note-1");
        assertThat(tokenUsagePort.records).hasSize(1);
        assertThat(tokenUsagePort.records.getFirst().featureId()).isEqualTo("rag-chat");
        assertThat(tokenUsagePort.records.getFirst().modelId()).isEqualTo("gpt-test");
        assertThat(tokenUsagePort.records.getFirst().estimatedCost()).isNotNull();
    }

    @Test
    void emptyContextSkipsAiCallAndStoresNoContextAnswer() {
        ChatThread thread = existingThread();
        persistencePort.saveThread(thread);

        var events = service.sendChatMessage(new SendChatMessageCommand(
            "user-1",
            thread.threadId(),
            "없는 내용?",
            Map.of(),
            "gpt-test"
        )).collectList().block();

        assertThat(events).hasSize(2);
        assertThat(events.getFirst().eventName()).isEqualTo("delta");
        assertThat(events.getFirst().data().get("text")).asString().contains("관련 노트 근거");
        assertThat(aiChatPort.calls).isZero();
        assertThat(persistencePort.messages).hasSize(2);
        assertThat(persistencePort.messages.get(1).role()).isEqualTo(ChatRole.ASSISTANT);
        assertThat(chatEventPort.messageEvents).hasSize(1);
        assertThat(tokenUsagePort.records).hasSize(1);
    }

    @Test
    void entitlementDeniedStopsBeforeAiCallButKeepsUserMessage() {
        ChatThread thread = existingThread();
        persistencePort.saveThread(thread);
        retrievalPort.results = List.of(new NoteChunkSearchResult(
            "user-1",
            "group-1",
            "note-1",
            "note-1::0",
            0,
            "RAG note",
            "context",
            0.9d,
            "hash",
            1,
            null,
            null
        ));
        entitlementPort.allowed = false;
        entitlementPort.reasonCode = "QUOTA_EXHAUSTED";

        assertThatThrownBy(() -> service.sendChatMessage(new SendChatMessageCommand(
            "user-1",
            thread.threadId(),
            "RAG란?",
            Map.of(),
            "gpt-test"
        )))
            .isInstanceOf(ChatDomainException.class)
            .hasMessageContaining("QUOTA_EXHAUSTED");

        assertThat(aiChatPort.calls).isZero();
        assertThat(persistencePort.messages).hasSize(1);
        assertThat(chatEventPort.messageEvents).isEmpty();
        assertThat(tokenUsagePort.records).isEmpty();
    }

    @Test
    void noteScopeDocumentGroupMustMatchThread() {
        ChatThread thread = existingThread();
        persistencePort.saveThread(thread);

        assertThatThrownBy(() -> service.sendChatMessage(new SendChatMessageCommand(
            "user-1",
            thread.threadId(),
            "RAG란?",
            Map.of("documentGroupId", "other-group"),
            "gpt-test"
        )))
            .isInstanceOf(ChatDomainException.class)
            .hasMessageContaining("noteScope.documentGroupId");
    }

    @Test
    void streamFailureEmitsErrorEventAndDoesNotStoreAssistantMessage() {
        ChatThread thread = existingThread();
        persistencePort.saveThread(thread);
        retrievalPort.results = List.of(new NoteChunkSearchResult(
            "user-1",
            "group-1",
            "note-1",
            "note-1::0",
            0,
            "RAG note",
            "context",
            0.9d,
            "hash",
            1,
            null,
            null
        ));
        aiChatPort.chunks = Flux.concat(
            Flux.just(new AiChatChunk("partial", false)),
            Flux.error(new IllegalStateException("provider down"))
        );

        var events = service.sendChatMessage(new SendChatMessageCommand(
            "user-1",
            thread.threadId(),
            "RAG란?",
            Map.of(),
            "gpt-test"
        )).collectList().block();

        assertThat(events).hasSize(2);
        assertThat(events.getFirst().eventName()).isEqualTo("delta");
        assertThat(events.get(1).eventName()).isEqualTo("error");
        assertThat(events.get(1).data()).containsEntry("code", "STREAM_ERROR");
        assertThat(persistencePort.messages).hasSize(1);
        assertThat(chatEventPort.messageEvents).isEmpty();
        assertThat(tokenUsagePort.records).isEmpty();
    }

    private static ChatThread existingThread() {
        return new ChatThread("thread-1", "user-1", "group-1", "RAG 질문", "gpt-test", null);
    }

    private static final class FakeChatPersistencePort implements ChatPersistencePort {

        private final List<ChatThread> threads = new ArrayList<>();
        private final List<ChatMessage> messages = new ArrayList<>();

        @Override
        public ChatThread saveThread(ChatThread thread) {
            threads.add(thread);
            return thread;
        }

        @Override
        public Optional<ChatThread> findThreadByUserIdAndThreadId(String userId, String threadId) {
            return threads.stream()
                .filter(thread -> thread.userId().equals(userId) && thread.threadId().equals(threadId))
                .findFirst();
        }

        @Override
        public ChatMessage saveMessage(ChatMessage message) {
            messages.add(message);
            return message;
        }

        @Override
        public List<ChatMessage> findMessagesByUserIdAndThreadId(String userId, String threadId) {
            return messages.stream()
                .filter(message -> message.userId().equals(userId) && message.threadId().equals(threadId))
                .sorted(Comparator.comparing(ChatMessage::createdAt))
                .toList();
        }
    }

    private static final class FakeNoteChunkRetrievalPort implements NoteChunkRetrievalPort {

        private List<NoteChunkSearchResult> results = List.of();
        private NoteChunkSearchQuery lastQuery;

        @Override
        public List<NoteChunkSearchResult> searchChunks(NoteChunkSearchQuery query) {
            lastQuery = query;
            return results;
        }
    }

    private static final class FakeEntitlementPort implements EntitlementPort {

        private boolean allowed = true;
        private String reasonCode;
        private EntitlementRequest lastRequest;

        @Override
        public EntitlementDecision checkEntitlement(EntitlementRequest request) {
            lastRequest = request;
            return new EntitlementDecision(allowed, reasonCode, allowed ? 1000 : 0);
        }
    }

    private static final class FakeAiChatPort implements AiChatPort {

        private int calls;
        private AiChatRequest lastRequest;
        private Flux<AiChatChunk> chunks = Flux.empty();

        @Override
        public AiChatResponse generate(AiChatRequest request) {
            return new AiChatResponse("", null);
        }

        @Override
        public Flux<AiChatChunk> stream(AiChatRequest request) {
            calls++;
            lastRequest = request;
            return chunks;
        }
    }

    private static final class FakeTokenUsagePort implements TokenUsagePort {

        private final List<TokenUsageRecord> records = new ArrayList<>();

        @Override
        public void recordTokenUsage(TokenUsageRecord record) {
            records.add(record);
        }
    }

    private static final class FakeAiModelCatalogPort implements AiModelCatalogPort {

        private AiModel model;

        @Override
        public List<AiModel> findAll() {
            return model == null ? List.of() : List.of(model);
        }

        @Override
        public Optional<AiModel> findByModelId(String modelId) {
            return model != null && model.modelId().equals(modelId)
                ? Optional.of(model)
                : Optional.empty();
        }

        @Override
        public boolean existsByModelId(String modelId) {
            return model != null && model.modelId().equals(modelId);
        }
    }

    private static final class FakeChatEventPort implements ChatEventPort {

        private final List<ChatThreadCreatedEvent> threadEvents = new ArrayList<>();
        private final List<ChatMessageCreatedEvent> messageEvents = new ArrayList<>();

        @Override
        public void chatThreadCreated(ChatThreadCreatedEvent event) {
            threadEvents.add(event);
        }

        @Override
        public void chatMessageCreated(ChatMessageCreatedEvent event) {
            messageEvents.add(event);
        }
    }
}
