package com.brainx.intelligence.infrastructure.dev.rag;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;

import com.brainx.intelligence.exploration.application.port.outbound.NoteChunkRetrievalPort;
import com.brainx.intelligence.exploration.application.port.outbound.NoteSearchIndexPort;
import com.brainx.intelligence.exploration.domain.NoteChunkSearchResult;
import com.brainx.intelligence.exploration.domain.NoteSearchDocument;
import com.brainx.intelligence.exploration.domain.SemanticSearchResult;
import com.brainx.intelligence.infrastructure.events.note.MarkdownNoteChunker;
import com.brainx.intelligence.infrastructure.events.note.NoteProjection;
import com.brainx.intelligence.infrastructure.events.note.NoteProjectionStore;
import com.brainx.intelligence.infrastructure.events.note.NoteSearchIndexStatus;
import com.brainx.intelligence.settings.application.port.outbound.AiModelCatalogPort;
import com.brainx.intelligence.settings.domain.AiModel;
import com.brainx.intelligence.settings.domain.VendorTokenCost;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort.TokenUsageRecord;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator;

import reactor.core.publisher.Flux;

class SampleRagServiceTest {

    @TempDir
    private Path tempDir;

    @Test
    void ingestStoresProjectionAndReplacesChunks() throws Exception {
        Files.writeString(tempDir.resolve("rag.md"), "# RAG 품질\n\n본문 ".repeat(100));
        var properties = properties();
        FakeProjectionStore projectionStore = new FakeProjectionStore();
        FakeSearchIndex searchIndex = new FakeSearchIndex();

        var result = service(properties, projectionStore, searchIndex, new FakeChunkRetrieval(), null).ingest();

        assertThat(result.notesIndexed()).isEqualTo(1);
        assertThat(result.chunksIndexed()).isGreaterThan(0);
        assertThat(projectionStore.saved).hasSize(1);
        assertThat(projectionStore.saved.getFirst().markdownHash()).hasSize(64);
        assertThat(projectionStore.saved.getFirst().searchIndexStatus()).isEqualTo(NoteSearchIndexStatus.INDEXED);
        assertThat(projectionStore.saved.getFirst().indexedVersion()).isEqualTo(1);
        assertThat(projectionStore.saved.getFirst().indexedMarkdownHash()).hasSize(64);
        assertThat(searchIndex.replacedChunks).hasSize(1);
        assertThat(searchIndex.replacedChunks.getFirst()).isNotEmpty();
        assertThat(searchIndex.replacedChunks.getFirst().getFirst().markdownHash()).hasSize(64);
        assertThat(searchIndex.replacedChunks.getFirst().getFirst().sourcePath()).isEqualTo("rag.md");
        assertThat(searchIndex.replacedChunks.getFirst().getFirst().sourceFilename()).isEqualTo("rag.md");
    }

    @Test
    void askReturnsRetrievalOnlyWhenChatIsUnavailable() {
        FakeChunkRetrieval chunkRetrieval = new FakeChunkRetrieval();
        chunkRetrieval.results = List.of(new NoteChunkSearchResult(
            "sample-user",
            "note-1",
            "note-1::0",
            0,
            "RAG note",
            "chunk text",
            0.93d,
            "hash",
            1
        ));

        var response = service(properties(), new FakeProjectionStore(), new FakeSearchIndex(), chunkRetrieval, null)
            .ask("RAG란?");

        assertThat(response.answerMode()).isEqualTo("retrieval");
        assertThat(response.model()).isEqualTo("none");
        assertThat(response.contexts()).hasSize(1);
        assertThat(response.contexts().getFirst().title()).isEqualTo("RAG note");
    }

    @Test
    void askFiltersLowScoreChunksAndLimitsChunksPerNote() {
        FakeChunkRetrieval chunkRetrieval = new FakeChunkRetrieval();
        chunkRetrieval.results = List.of(
            new NoteChunkSearchResult("sample-user", "note-1", "note-1::0", 0, "RAG note", "first", 0.93d, "hash", 1),
            new NoteChunkSearchResult("sample-user", "note-1", "note-1::1", 1, "RAG note", "second", 0.81d, "hash", 1),
            new NoteChunkSearchResult("sample-user", "note-1", "note-1::2", 2, "RAG note", "third", 0.77d, "hash", 1),
            new NoteChunkSearchResult("sample-user", "note-2", "note-2::0", 0, "Low note", "low", 0.34d, "hash", 1),
            new NoteChunkSearchResult("sample-user", "note-3", "note-3::0", 0, "Other note", "other", 0.62d, "hash", 1)
        );

        var response = service(properties(), new FakeProjectionStore(), new FakeSearchIndex(), chunkRetrieval, null)
            .ask("RAG란?");

        assertThat(response.contexts()).extracting("chunkId")
            .containsExactly("note-1::0", "note-1::1", "note-3::0");
        assertThat(response.contexts()).extracting("noteId")
            .containsExactly("note-1", "note-1", "note-3");
        assertThat(chunkRetrieval.lastQuery.topK()).isEqualTo(16);
    }

    @Test
    void askTreatsLowScoreChunksAsNoContextAndSkipsChat() {
        FakeChunkRetrieval chunkRetrieval = new FakeChunkRetrieval();
        chunkRetrieval.results = List.of(new NoteChunkSearchResult(
            "sample-user",
            "note-1",
            "note-1::0",
            0,
            "RAG note",
            "unrelated",
            0.34d,
            "hash",
            1
        ));
        FakeAiChatPort aiChatPort = new FakeAiChatPort();
        FakeTokenUsagePort tokenUsagePort = new FakeTokenUsagePort();

        var response = service(
            properties(),
            new FakeProjectionStore(),
            new FakeSearchIndex(),
            chunkRetrieval,
            aiChatPort,
            tokenUsagePort
        ).ask("RAG란?");

        assertThat(response.answerMode()).isEqualTo("retrieval");
        assertThat(response.answer()).isEqualTo("관련 sample note chunk를 찾지 못했습니다.");
        assertThat(response.contexts()).isEmpty();
        assertThat(aiChatPort.lastRequest).isNull();
        assertThat(tokenUsagePort.records).isEmpty();
    }

    @Test
    void askUsesChatWhenAiChatPortIsAvailable() {
        FakeChunkRetrieval chunkRetrieval = new FakeChunkRetrieval();
        chunkRetrieval.results = List.of(new NoteChunkSearchResult(
            "sample-user",
            "note-1",
            "note-1::1",
            1,
            "RAG note",
            "chunk text for prompt",
            0.91d,
            "hash",
            1,
            "docs/rag.md",
            "rag.md"
        ));
        FakeAiChatPort aiChatPort = new FakeAiChatPort();
        FakeTokenUsagePort tokenUsagePort = new FakeTokenUsagePort();

        var response = service(
            properties(),
            new FakeProjectionStore(),
            new FakeSearchIndex(),
            chunkRetrieval,
            aiChatPort,
            tokenUsagePort
        )
            .ask("검색 흐름은?");

        assertThat(response.answerMode()).isEqualTo("llm");
        assertThat(response.model()).isEqualTo("gpt-5.4-mini");
        assertThat(response.answer()).isEqualTo("generated from context");
        assertThat(aiChatPort.lastRequest.modelId()).isEqualTo("gpt-5.4-mini");
        assertThat(aiChatPort.lastRequest.messages().get(1).content()).contains("chunk text for prompt");
        assertThat(aiChatPort.lastRequest.messages().get(1).content()).contains("sourcePath=docs/rag.md");
        assertThat(tokenUsagePort.records).hasSize(1);
        assertThat(tokenUsagePort.records.getFirst().featureId()).isEqualTo("sample-rag-chat");
        assertThat(tokenUsagePort.records.getFirst().inputTokens()).isEqualTo(100);
        assertThat(tokenUsagePort.records.getFirst().cachedInputTokens()).isEqualTo(40);
        assertThat(tokenUsagePort.records.getFirst().billableInputTokens()).isEqualTo(60);
        assertThat(tokenUsagePort.records.getFirst().outputTokens()).isEqualTo(20);
        assertThat(tokenUsagePort.records.getFirst().reasoningTokens()).isEqualTo(5);
        assertThat(tokenUsagePort.records.getFirst().estimatedCost()).isEqualByComparingTo("0.001280000000");
        assertThat(tokenUsagePort.records.getFirst().costCurrency()).isEqualTo("USD");
    }

    private SampleRagProperties properties() {
        SampleRagProperties properties = new SampleRagProperties();
        properties.setDirectory(tempDir);
        properties.setUserId("sample-user");
        properties.setChatModel("gpt-5.4-mini");
        return properties;
    }

    private static SampleRagService service(
        SampleRagProperties properties,
        FakeProjectionStore projectionStore,
        FakeSearchIndex searchIndex,
        FakeChunkRetrieval chunkRetrieval,
        AiChatPort aiChatPort
    ) {
        return service(
            properties,
            projectionStore,
            searchIndex,
            chunkRetrieval,
            aiChatPort,
            new FakeTokenUsagePort()
        );
    }

    private static SampleRagService service(
        SampleRagProperties properties,
        FakeProjectionStore projectionStore,
        FakeSearchIndex searchIndex,
        FakeChunkRetrieval chunkRetrieval,
        AiChatPort aiChatPort,
        FakeTokenUsagePort tokenUsagePort
    ) {
        DefaultListableBeanFactory beanFactory = new DefaultListableBeanFactory();
        if (aiChatPort != null) {
            beanFactory.registerSingleton("aiChatPort", aiChatPort);
        }
        return new SampleRagService(
            properties,
            new SampleNoteLoader(),
            projectionStore,
            new MarkdownNoteChunker(),
            searchIndex,
            chunkRetrieval,
            beanFactory.getBeanProvider(AiChatPort.class),
            tokenUsagePort,
            new AiTokenUsageCostEstimator(new FakeAiModelCatalog())
        );
    }

    private static final class FakeProjectionStore implements NoteProjectionStore {

        private final List<NoteProjection> saved = new ArrayList<>();

        @Override
        public Optional<NoteProjection> findByUserIdAndNoteId(String userId, String noteId) {
            return saved.stream()
                .filter(projection -> projection.userId().equals(userId) && projection.noteId().equals(noteId))
                .findFirst();
        }

        @Override
        public List<NoteProjection> findByUserIdAndNoteIds(String userId, List<String> noteIds) {
            return saved.stream()
                .filter(projection -> projection.userId().equals(userId) && noteIds.contains(projection.noteId()))
                .toList();
        }

        @Override
        public NoteProjection save(NoteProjection projection) {
            saved.add(projection);
            return projection;
        }
    }

    private static final class FakeSearchIndex implements NoteSearchIndexPort {

        private final List<List<NoteSearchDocument>> replacedChunks = new ArrayList<>();

        @Override
        public List<SemanticSearchResult> search(NoteSearchQuery query) {
            return List.of();
        }

        @Override
        public NoteSearchDocument save(NoteSearchDocument document) {
            return document;
        }

        @Override
        public boolean replaceNoteChunks(String userId, String noteId, List<NoteSearchDocument> chunks) {
            replacedChunks.add(chunks);
            return true;
        }

        @Override
        public boolean deleteByUserIdAndNoteId(String userId, String noteId) {
            return true;
        }
    }

    private static final class FakeChunkRetrieval implements NoteChunkRetrievalPort {

        private List<NoteChunkSearchResult> results = List.of();
        private NoteChunkSearchQuery lastQuery;

        @Override
        public List<NoteChunkSearchResult> searchChunks(NoteChunkSearchQuery query) {
            lastQuery = query;
            return results;
        }
    }

    private static final class FakeAiChatPort implements AiChatPort {

        private AiChatRequest lastRequest;

        @Override
        public AiChatResponse generate(AiChatRequest request) {
            lastRequest = request;
            return new AiChatResponse("generated from context", new AiTokenUsage(100, 20, 120, 40, 5));
        }

        @Override
        public Flux<AiChatChunk> stream(AiChatRequest request) {
            return Flux.empty();
        }
    }

    private static final class FakeTokenUsagePort implements TokenUsagePort {

        private final List<TokenUsageRecord> records = new ArrayList<>();

        @Override
        public void recordTokenUsage(TokenUsageRecord record) {
            records.add(record);
        }
    }

    private static final class FakeAiModelCatalog implements AiModelCatalogPort {

        private static final AiModel MODEL = new AiModel(
            "gpt-5.4-mini",
            "GPT-5.4 mini",
            "openai",
            new VendorTokenCost(
                new BigDecimal("0.010000"),
                new BigDecimal("0.002000"),
                new BigDecimal("0.030000"),
                "USD"
            )
        );

        @Override
        public List<AiModel> findAll() {
            return List.of(MODEL);
        }

        @Override
        public Optional<AiModel> findByModelId(String modelId) {
            return MODEL.modelId().equals(modelId) ? Optional.of(MODEL) : Optional.empty();
        }

        @Override
        public boolean existsByModelId(String modelId) {
            return MODEL.modelId().equals(modelId);
        }
    }
}
