package com.brainx.intelligence.autolink.application.usecase;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkCommand;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkComparison;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkCostEstimate;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkResult;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkStrategyResult;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkSuggestion;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkUsageRecord;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkUsageSummary;
import com.brainx.intelligence.autolink.application.port.outbound.AutoLinkNoteSourcePort;
import com.brainx.intelligence.autolink.application.port.outbound.AutoLinkNoteSourcePort.AutoLinkNoteSource;
import com.brainx.intelligence.autolink.application.port.outbound.AutoLinkUsageCapturePort;
import com.brainx.intelligence.autolink.domain.MarkdownAnchorLocator;
import com.brainx.intelligence.autolink.domain.MarkdownAnchorLocator.AnchorRange;
import com.brainx.intelligence.autolink.domain.NoteAutoLinkStrategy;
import com.brainx.intelligence.exploration.application.port.outbound.NoteChunkRetrievalPort;
import com.brainx.intelligence.exploration.application.port.outbound.NoteChunkRetrievalPort.NoteChunkSearchQuery;
import com.brainx.intelligence.exploration.domain.NoteChunkSearchResult;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatMessage;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatRequest;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiChatResponse;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiRole;
import com.brainx.intelligence.shared.application.port.outbound.AiChatPort.AiTokenUsage;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort.TokenUsageRecord;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator;
import com.brainx.intelligence.shared.application.service.AiTokenUsageCostEstimator.TokenCostEstimate;
import com.brainx.intelligence.shared.domain.DocumentGroups;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class NoteAutoLinkService implements NoteAutoLinkUseCase {

    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_LIMIT_EXCEEDED = "LIMIT_EXCEEDED";
    private static final String STATUS_NO_NOTES = "NO_NOTES";
    private static final String STATUS_AI_UNAVAILABLE = "AI_UNAVAILABLE";
    private static final String SOURCE_SERVICE = "AI-Service";
    private static final String VECTOR_FEATURE_ID = "note-auto-link-vector-refine-chat";
    private static final String LLM_ONLY_FEATURE_ID = "note-auto-link-llm-only-chat";
    private static final int SOURCE_WINDOW_LENGTH = 1_200;
    private static final int SOURCE_WINDOW_OVERLAP = 150;
    private static final int SOURCE_MARKDOWN_PROMPT_LIMIT = 4_000;
    private static final int NOTE_CARD_EXCERPT_LIMIT = 500;
    private static final int EVIDENCE_LIMIT = 600;

    private final NoteAutoLinkProperties properties;
    private final AutoLinkNoteSourcePort noteSourcePort;
    private final NoteChunkRetrievalPort noteChunkRetrievalPort;
    private final AiChatPort aiChatPort;
    private final TokenUsagePort tokenUsagePort;
    private final AiTokenUsageCostEstimator usageCostEstimator;
    private final MarkdownAnchorLocator anchorLocator = new MarkdownAnchorLocator();
    private final ObjectMapper objectMapper;
    private final ObjectProvider<AutoLinkUsageCapturePort> usageCapturePortProvider;

    public NoteAutoLinkService(
        NoteAutoLinkProperties properties,
        AutoLinkNoteSourcePort noteSourcePort,
        NoteChunkRetrievalPort noteChunkRetrievalPort,
        AiChatPort aiChatPort,
        TokenUsagePort tokenUsagePort,
        AiTokenUsageCostEstimator usageCostEstimator,
        ObjectMapper objectMapper,
        ObjectProvider<AutoLinkUsageCapturePort> usageCapturePortProvider
    ) {
        this.properties = properties;
        this.noteSourcePort = noteSourcePort;
        this.noteChunkRetrievalPort = noteChunkRetrievalPort;
        this.aiChatPort = aiChatPort;
        this.tokenUsagePort = tokenUsagePort;
        this.usageCostEstimator = usageCostEstimator;
        this.objectMapper = objectMapper;
        this.usageCapturePortProvider = usageCapturePortProvider;
    }

    @Override
    public AutoLinkResult analyze(AutoLinkCommand command) {
        String userId = requireText(command.userId(), "userId");
        String documentGroupId = DocumentGroups.normalize(command.documentGroupId());
        NoteAutoLinkStrategy requestedStrategy = command.strategy() == null
            ? NoteAutoLinkStrategy.COMPARE
            : command.strategy();
        int maxNotes = normalizeMaxNotes(command.maxNotes());
        String modelId = StringUtils.hasText(command.modelId()) ? command.modelId().trim() : properties.getModel();

        List<AutoLinkNoteSource> loaded = noteSourcePort.findSearchableNoteSources(
            userId,
            documentGroupId,
            maxNotes + 1
        );
        if (loaded.size() > maxNotes) {
            return new AutoLinkResult(
                userId,
                documentGroupId,
                requestedStrategy,
                STATUS_LIMIT_EXCEEDED,
                true,
                maxNotes,
                loaded.size(),
                0,
                List.of(),
                new AutoLinkComparison(0, 0, 0)
            );
        }
        if (loaded.isEmpty()) {
            return new AutoLinkResult(
                userId,
                documentGroupId,
                requestedStrategy,
                STATUS_NO_NOTES,
                false,
                maxNotes,
                0,
                0,
                List.of(),
                new AutoLinkComparison(0, 0, 0)
            );
        }

        List<AutoLinkNoteSource> notes = loaded.stream()
            .sorted(Comparator.comparing(AutoLinkNoteSource::noteId))
            .toList();
        List<AutoLinkStrategyResult> strategyResults = switch (requestedStrategy) {
            case COMPARE -> List.of(
                runWithUsageCapture(NoteAutoLinkStrategy.VECTOR_LLM, () -> analyzeVectorLlm(userId, documentGroupId, modelId, notes)),
                runWithUsageCapture(NoteAutoLinkStrategy.LLM_ONLY, () -> analyzeLlmOnly(userId, modelId, notes))
            );
            case VECTOR_LLM -> List.of(runWithUsageCapture(NoteAutoLinkStrategy.VECTOR_LLM, () -> analyzeVectorLlm(userId, documentGroupId, modelId, notes)));
            case LLM_ONLY -> List.of(runWithUsageCapture(NoteAutoLinkStrategy.LLM_ONLY, () -> analyzeLlmOnly(userId, modelId, notes)));
        };

        return new AutoLinkResult(
            userId,
            documentGroupId,
            requestedStrategy,
            STATUS_COMPLETED,
            false,
            maxNotes,
            notes.size(),
            notes.size(),
            strategyResults,
            comparison(strategyResults)
        );
    }

    private AutoLinkStrategyResult analyzeVectorLlm(
        String userId,
        String documentGroupId,
        String modelId,
        List<AutoLinkNoteSource> notes
    ) {
        Instant startedAt = Instant.now();
        Map<String, AutoLinkNoteSource> notesById = notesById(notes);
        List<AutoLinkSuggestion> suggestions = new ArrayList<>();
        int llmCalls = 0;
        int candidatePairCount = 0;
        int filteredInvalidAnchors = 0;

        for (AutoLinkNoteSource source : notes) {
            List<VectorCandidate> candidates = vectorCandidates(userId, documentGroupId, source, notesById);
            candidatePairCount += candidates.size();
            if (candidates.isEmpty()) {
                continue;
            }
            AiChatResponse response = generate(
                modelId,
                VECTOR_FEATURE_ID,
                source.userId(),
                vectorSystemPrompt(),
                vectorUserPrompt(source, candidates)
            );
            if (response == null) {
                return emptyStrategyResult(NoteAutoLinkStrategy.VECTOR_LLM, STATUS_AI_UNAVAILABLE, modelId, notes.size(), startedAt);
            }
            llmCalls++;
            ValidatedSuggestions validated = validateSuggestions(
                NoteAutoLinkStrategy.VECTOR_LLM,
                source,
                notesById,
                parseLlmSuggestions(response.content()),
                candidatesByTarget(candidates)
            );
            suggestions.addAll(validated.suggestions());
            filteredInvalidAnchors += validated.filteredInvalidAnchorCount();
        }
        return strategyResult(
            NoteAutoLinkStrategy.VECTOR_LLM,
            STATUS_COMPLETED,
            modelId,
            notes.size(),
            llmCalls,
            candidatePairCount,
            filteredInvalidAnchors,
            suggestions,
            List.of(),
            startedAt
        );
    }

    private AutoLinkStrategyResult analyzeLlmOnly(String userId, String modelId, List<AutoLinkNoteSource> notes) {
        Instant startedAt = Instant.now();
        Map<String, AutoLinkNoteSource> notesById = notesById(notes);
        List<NoteCard> cards = notes.stream().map(NoteAutoLinkService::noteCard).toList();
        List<AutoLinkSuggestion> suggestions = new ArrayList<>();
        int llmCalls = 0;
        int filteredInvalidAnchors = 0;

        for (AutoLinkNoteSource source : notes) {
            List<NoteCard> otherCards = cards.stream()
                .filter(card -> !card.noteId().equals(source.noteId()))
                .toList();
            if (otherCards.isEmpty()) {
                continue;
            }
            AiChatResponse response = generate(
                modelId,
                LLM_ONLY_FEATURE_ID,
                userId,
                llmOnlySystemPrompt(),
                llmOnlyUserPrompt(source, otherCards)
            );
            if (response == null) {
                return emptyStrategyResult(NoteAutoLinkStrategy.LLM_ONLY, STATUS_AI_UNAVAILABLE, modelId, notes.size(), startedAt);
            }
            llmCalls++;
            ValidatedSuggestions validated = validateSuggestions(
                NoteAutoLinkStrategy.LLM_ONLY,
                source,
                notesById,
                parseLlmSuggestions(response.content()),
                Map.of()
            );
            suggestions.addAll(validated.suggestions());
            filteredInvalidAnchors += validated.filteredInvalidAnchorCount();
        }
        return strategyResult(
            NoteAutoLinkStrategy.LLM_ONLY,
            STATUS_COMPLETED,
            modelId,
            notes.size(),
            llmCalls,
            Math.max(0, notes.size() * (notes.size() - 1)),
            filteredInvalidAnchors,
            suggestions,
            List.of(),
            startedAt
        );
    }

    private List<VectorCandidate> vectorCandidates(
        String userId,
        String documentGroupId,
        AutoLinkNoteSource source,
        Map<String, AutoLinkNoteSource> notesById
    ) {
        Map<String, VectorCandidate> bestByTarget = new LinkedHashMap<>();
        for (SourceWindow window : sourceWindows(source)) {
            List<NoteChunkSearchResult> hits = noteChunkRetrievalPort.searchChunks(new NoteChunkSearchQuery(
                userId,
                documentGroupId,
                source.title() + "\n\n" + window.text(),
                properties.getVectorTopK()
            ));
            for (NoteChunkSearchResult hit : hits) {
                if (hit.noteId().equals(source.noteId())
                    || hit.score() < properties.getMinVectorScore()
                    || !notesById.containsKey(hit.noteId())) {
                    continue;
                }
                VectorCandidate candidate = new VectorCandidate(
                    hit.noteId(),
                    notesById.get(hit.noteId()).title(),
                    hit.chunkId(),
                    hit.chunkIndex(),
                    hit.score(),
                    snippet(hit.text(), EVIDENCE_LIMIT)
                );
                VectorCandidate existing = bestByTarget.get(candidate.targetNoteId());
                if (existing == null || candidate.vectorScore() > existing.vectorScore()) {
                    bestByTarget.put(candidate.targetNoteId(), candidate);
                }
            }
        }
        return bestByTarget.values().stream()
            .sorted(Comparator.comparingDouble(VectorCandidate::vectorScore).reversed())
            .limit(Math.max(properties.getMaxSuggestionsPerNote() * 4L, properties.getMaxSuggestionsPerNote()))
            .toList();
    }

    private AiChatResponse generate(
        String modelId,
        String featureId,
        String userId,
        String systemPrompt,
        String userPrompt
    ) {
        try {
            AiChatResponse response = aiChatPort.generate(new AiChatRequest(
                modelId,
                List.of(
                    new AiChatMessage(AiRole.SYSTEM, systemPrompt),
                    new AiChatMessage(AiRole.USER, userPrompt)
                )
            ));
            recordChatUsage(userId, featureId, modelId, response == null ? null : response.tokenUsage());
            return response;
        } catch (IllegalStateException exception) {
            if (exception.getMessage() != null && exception.getMessage().contains("ChatClient.Builder bean is not configured")) {
                return null;
            }
            throw exception;
        }
    }

    private void recordChatUsage(String userId, String featureId, String modelId, AiTokenUsage tokenUsage) {
        if (tokenUsage == null || !tokenUsage.hasKnownTokens()) {
            return;
        }
        int inputTokens = tokenCount(tokenUsage.promptTokens());
        int cachedInputTokens = tokenCount(tokenUsage.cachedPromptTokens());
        int billableInputTokens = Math.max(0, inputTokens - cachedInputTokens);
        int outputTokens = tokenCount(tokenUsage.completionTokens());
        int reasoningTokens = tokenCount(tokenUsage.reasoningTokens());
        int totalTokens = tokenUsage.totalTokens() == null ? inputTokens + outputTokens : Math.max(0, tokenUsage.totalTokens());
        TokenCostEstimate cost = usageCostEstimator.estimate(modelId, inputTokens, cachedInputTokens, outputTokens);
        tokenUsagePort.recordTokenUsage(new TokenUsageRecord(
            UUID.randomUUID().toString(),
            userId,
            SOURCE_SERVICE,
            featureId,
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

    private ValidatedSuggestions validateSuggestions(
        NoteAutoLinkStrategy strategy,
        AutoLinkNoteSource source,
        Map<String, AutoLinkNoteSource> notesById,
        List<LlmSuggestion> llmSuggestions,
        Map<String, VectorCandidate> vectorCandidatesByTarget
    ) {
        List<AutoLinkSuggestion> suggestions = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int filtered = 0;
        for (LlmSuggestion llmSuggestion : llmSuggestions) {
            if (suggestions.size() >= properties.getMaxSuggestionsPerNote()) {
                break;
            }
            AutoLinkNoteSource target = notesById.get(llmSuggestion.targetNoteId());
            if (target == null || target.noteId().equals(source.noteId())) {
                filtered++;
                continue;
            }
            Optional<AnchorRange> anchor = anchorLocator.locate(source.markdown(), llmSuggestion.anchorText());
            if (anchor.isEmpty()) {
                filtered++;
                continue;
            }
            String key = source.noteId() + "::" + target.noteId() + "::" + anchor.get().startOffset() + "::" + anchor.get().endOffset();
            if (!seen.add(key)) {
                continue;
            }
            VectorCandidate vectorCandidate = vectorCandidatesByTarget.get(target.noteId());
            suggestions.add(new AutoLinkSuggestion(
                UUID.randomUUID().toString(),
                source.noteId(),
                source.title(),
                target.noteId(),
                target.title(),
                anchor.get(),
                llmSuggestion.confidence(),
                vectorCandidate == null ? null : vectorCandidate.vectorScore(),
                llmSuggestion.reason(),
                evidence(strategy, target, vectorCandidate)
            ));
        }
        return new ValidatedSuggestions(suggestions, filtered);
    }

    private List<LlmSuggestion> parseLlmSuggestions(String content) {
        if (!StringUtils.hasText(content)) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(jsonPayload(content));
            JsonNode suggestionsNode = root.isArray() ? root : root.get("suggestions");
            if (suggestionsNode == null || !suggestionsNode.isArray()) {
                return List.of();
            }
            List<LlmSuggestion> suggestions = new ArrayList<>();
            for (JsonNode node : suggestionsNode) {
                String anchorText = text(node, "anchorText");
                String targetNoteId = text(node, "targetNoteId");
                if (!StringUtils.hasText(anchorText) || !StringUtils.hasText(targetNoteId)) {
                    continue;
                }
                suggestions.add(new LlmSuggestion(
                    anchorText,
                    targetNoteId,
                    text(node, "reason"),
                    confidence(node.get("confidence"))
                ));
            }
            return suggestions;
        } catch (Exception exception) {
            return List.of();
        }
    }

    private AutoLinkStrategyResult runWithUsageCapture(NoteAutoLinkStrategy strategy, StrategySupplier supplier) {
        AutoLinkUsageCapturePort capturePort = usageCapturePortProvider.getIfAvailable();
        if (capturePort != null) {
            capturePort.begin();
        }
        AutoLinkStrategyResult result;
        try {
            result = supplier.get();
        } catch (RuntimeException | Error exception) {
            if (capturePort != null) {
                capturePort.drain();
            }
            throw exception;
        }
        List<TokenUsageRecord> records = capturePort == null ? List.of() : capturePort.drain();
        return withUsageRecords(result, toUsageRecords(records));
    }

    private static AutoLinkStrategyResult withUsageRecords(
        AutoLinkStrategyResult result,
        List<AutoLinkUsageRecord> usageRecords
    ) {
        return new AutoLinkStrategyResult(
            result.strategy(),
            result.status(),
            result.modelId(),
            result.analyzedNoteCount(),
            result.llmCallCount(),
            result.candidatePairCount(),
            result.suggestionCount(),
            result.validAnchorCount(),
            result.filteredInvalidAnchorCount(),
            result.elapsedMs(),
            result.suggestions(),
            usageRecords,
            usageSummary(usageRecords)
        );
    }

    private AutoLinkStrategyResult strategyResult(
        NoteAutoLinkStrategy strategy,
        String status,
        String modelId,
        int analyzedNoteCount,
        int llmCallCount,
        int candidatePairCount,
        int filteredInvalidAnchors,
        List<AutoLinkSuggestion> suggestions,
        List<AutoLinkUsageRecord> usageRecords,
        Instant startedAt
    ) {
        return new AutoLinkStrategyResult(
            strategy,
            status,
            modelId,
            analyzedNoteCount,
            llmCallCount,
            candidatePairCount,
            suggestions.size(),
            suggestions.size(),
            filteredInvalidAnchors,
            elapsedMs(startedAt),
            suggestions,
            usageRecords,
            usageSummary(usageRecords)
        );
    }

    private AutoLinkStrategyResult emptyStrategyResult(
        NoteAutoLinkStrategy strategy,
        String status,
        String modelId,
        int analyzedNoteCount,
        Instant startedAt
    ) {
        return strategyResult(strategy, status, modelId, analyzedNoteCount, 0, 0, 0, List.of(), List.of(), startedAt);
    }

    private static AutoLinkComparison comparison(List<AutoLinkStrategyResult> results) {
        Set<String> vector = suggestionKeys(results, NoteAutoLinkStrategy.VECTOR_LLM);
        Set<String> llmOnly = suggestionKeys(results, NoteAutoLinkStrategy.LLM_ONLY);
        Set<String> overlap = new HashSet<>(vector);
        overlap.retainAll(llmOnly);
        return new AutoLinkComparison(
            overlap.size(),
            Math.max(0, vector.size() - overlap.size()),
            Math.max(0, llmOnly.size() - overlap.size())
        );
    }

    private static Set<String> suggestionKeys(List<AutoLinkStrategyResult> results, NoteAutoLinkStrategy strategy) {
        return results.stream()
            .filter(result -> result.strategy() == strategy)
            .findFirst()
            .map(result -> result.suggestions().stream()
                .map(NoteAutoLinkService::suggestionKey)
                .collect(java.util.stream.Collectors.toSet()))
            .orElseGet(Set::of);
    }

    private static String suggestionKey(AutoLinkSuggestion suggestion) {
        return suggestion.sourceNoteId()
            + "::" + suggestion.targetNoteId()
            + "::" + suggestion.anchor().startOffset()
            + "::" + suggestion.anchor().endOffset();
    }

    private static List<AutoLinkUsageRecord> toUsageRecords(List<TokenUsageRecord> records) {
        if (records == null || records.isEmpty()) {
            return List.of();
        }
        return records.stream()
            .map(record -> new AutoLinkUsageRecord(
                record.featureId(),
                record.modelId(),
                record.inputTokens(),
                record.cachedInputTokens(),
                record.billableInputTokens(),
                record.outputTokens(),
                record.reasoningTokens(),
                record.totalTokens(),
                new AutoLinkCostEstimate(
                    record.estimatedInputCost(),
                    record.estimatedCachedInputCost(),
                    record.estimatedOutputCost(),
                    record.estimatedCost(),
                    record.costCurrency()
                )
            ))
            .toList();
    }

    private static AutoLinkUsageSummary usageSummary(List<AutoLinkUsageRecord> records) {
        if (records == null || records.isEmpty()) {
            return new AutoLinkUsageSummary(0, 0, 0, 0, 0, 0, new AutoLinkCostEstimate(null, null, null, null, null));
        }
        int inputTokens = records.stream().mapToInt(AutoLinkUsageRecord::inputTokens).sum();
        int cachedInputTokens = records.stream().mapToInt(AutoLinkUsageRecord::cachedInputTokens).sum();
        int billableInputTokens = records.stream().mapToInt(AutoLinkUsageRecord::billableInputTokens).sum();
        int outputTokens = records.stream().mapToInt(AutoLinkUsageRecord::outputTokens).sum();
        int reasoningTokens = records.stream().mapToInt(AutoLinkUsageRecord::reasoningTokens).sum();
        int totalTokens = records.stream().mapToInt(AutoLinkUsageRecord::totalTokens).sum();
        return new AutoLinkUsageSummary(
            inputTokens,
            cachedInputTokens,
            billableInputTokens,
            outputTokens,
            reasoningTokens,
            totalTokens,
            new AutoLinkCostEstimate(
                sumCost(records, record -> record.costEstimate().inputCost()),
                sumCost(records, record -> record.costEstimate().cachedInputCost()),
                sumCost(records, record -> record.costEstimate().outputCost()),
                sumCost(records, record -> record.costEstimate().totalCost()),
                commonCurrency(records)
            )
        );
    }

    private static BigDecimal sumCost(List<AutoLinkUsageRecord> records, CostGetter getter) {
        BigDecimal total = BigDecimal.ZERO;
        for (AutoLinkUsageRecord record : records) {
            BigDecimal value = getter.get(record);
            if (value == null) {
                return null;
            }
            total = total.add(value);
        }
        return total.stripTrailingZeros();
    }

    private static String commonCurrency(List<AutoLinkUsageRecord> records) {
        String currency = null;
        for (AutoLinkUsageRecord record : records) {
            String current = record.costEstimate().currencyCode();
            if (!StringUtils.hasText(current)) {
                return null;
            }
            if (currency == null) {
                currency = current;
            } else if (!currency.equals(current)) {
                return null;
            }
        }
        return currency;
    }

    private static String vectorSystemPrompt() {
        return """
            You find useful note links. Return only strict JSON.
            The JSON must be an array of objects with anchorText, targetNoteId, reason, confidence.
            anchorText must be copied exactly from the source markdown.
            Do not include markdown fences or commentary.
            """;
    }

    private static String llmOnlySystemPrompt() {
        return """
            You find useful note links by comparing one source note to note cards from the same document group.
            Return only strict JSON array. Each object must have anchorText, targetNoteId, reason, confidence.
            anchorText must be copied exactly from the source markdown.
            Do not include markdown fences or commentary.
            """;
    }

    private String vectorUserPrompt(AutoLinkNoteSource source, List<VectorCandidate> candidates) {
        StringBuilder builder = new StringBuilder();
        builder.append("Source note:\n");
        appendSource(builder, source);
        builder.append("\nVector candidate target notes:\n");
        for (VectorCandidate candidate : candidates) {
            builder.append("- targetNoteId: ").append(candidate.targetNoteId()).append('\n')
                .append("  targetTitle: ").append(candidate.targetTitle()).append('\n')
                .append("  vectorScore: ").append(candidate.vectorScore()).append('\n')
                .append("  evidence: ").append(candidate.evidence()).append("\n");
        }
        builder.append("\nReturn at most ").append(properties.getMaxSuggestionsPerNote()).append(" suggestions.");
        return builder.toString();
    }

    private String llmOnlyUserPrompt(AutoLinkNoteSource source, List<NoteCard> cards) {
        StringBuilder builder = new StringBuilder();
        builder.append("Source note:\n");
        appendSource(builder, source);
        builder.append("\nDocument group note cards:\n");
        for (NoteCard card : cards) {
            builder.append("- noteId: ").append(card.noteId()).append('\n')
                .append("  title: ").append(card.title()).append('\n')
                .append("  tags: ").append(card.tags()).append('\n')
                .append("  headings: ").append(card.headings()).append('\n')
                .append("  excerpt: ").append(card.excerpt()).append("\n");
        }
        builder.append("\nReturn at most ").append(properties.getMaxSuggestionsPerNote()).append(" suggestions.");
        return builder.toString();
    }

    private static void appendSource(StringBuilder builder, AutoLinkNoteSource source) {
        builder.append("noteId: ").append(source.noteId()).append('\n')
            .append("title: ").append(source.title()).append('\n')
            .append("tags: ").append(source.tags()).append('\n')
            .append("markdown:\n")
            .append(snippet(source.markdown(), SOURCE_MARKDOWN_PROMPT_LIMIT))
            .append('\n');
    }

    private List<SourceWindow> sourceWindows(AutoLinkNoteSource note) {
        String markdown = note.markdown() == null ? "" : note.markdown();
        if (markdown.isBlank()) {
            return List.of();
        }
        List<SourceWindow> windows = new ArrayList<>();
        int start = 0;
        while (start < markdown.length() && windows.size() < properties.getMaxSourceWindowsPerNote()) {
            int end = Math.min(markdown.length(), start + SOURCE_WINDOW_LENGTH);
            windows.add(new SourceWindow(start, end, markdown.substring(start, end)));
            if (end == markdown.length()) {
                break;
            }
            start = Math.max(start + 1, end - SOURCE_WINDOW_OVERLAP);
        }
        return windows;
    }

    private static Map<String, AutoLinkNoteSource> notesById(List<AutoLinkNoteSource> notes) {
        Map<String, AutoLinkNoteSource> values = new LinkedHashMap<>();
        for (AutoLinkNoteSource note : notes) {
            values.put(note.noteId(), note);
        }
        return values;
    }

    private static Map<String, VectorCandidate> candidatesByTarget(List<VectorCandidate> candidates) {
        return candidates.stream()
            .collect(java.util.stream.Collectors.toMap(
                VectorCandidate::targetNoteId,
                candidate -> candidate,
                (left, right) -> left.vectorScore() >= right.vectorScore() ? left : right,
                LinkedHashMap::new
            ));
    }

    private static NoteCard noteCard(AutoLinkNoteSource note) {
        return new NoteCard(
            note.noteId(),
            note.title(),
            note.tags(),
            headings(note.markdown()),
            snippet(normalizeWhitespace(note.markdown()), NOTE_CARD_EXCERPT_LIMIT)
        );
    }

    private static List<String> headings(String markdown) {
        if (!StringUtils.hasText(markdown)) {
            return List.of();
        }
        return markdown.lines()
            .map(String::trim)
            .filter(line -> line.startsWith("#"))
            .map(line -> line.replaceFirst("^#+", "").trim())
            .filter(StringUtils::hasText)
            .limit(8)
            .toList();
    }

    private static String evidence(
        NoteAutoLinkStrategy strategy,
        AutoLinkNoteSource target,
        VectorCandidate vectorCandidate
    ) {
        if (strategy == NoteAutoLinkStrategy.VECTOR_LLM && vectorCandidate != null) {
            return vectorCandidate.evidence();
        }
        return noteCard(target).excerpt();
    }

    private static String jsonPayload(String content) {
        String trimmed = content.trim();
        int arrayStart = trimmed.indexOf('[');
        int arrayEnd = trimmed.lastIndexOf(']');
        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            return trimmed.substring(arrayStart, arrayEnd + 1);
        }
        int objectStart = trimmed.indexOf('{');
        int objectEnd = trimmed.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            return trimmed.substring(objectStart, objectEnd + 1);
        }
        return trimmed;
    }

    private static String text(JsonNode node, String fieldName) {
        JsonNode value = node == null ? null : node.get(fieldName);
        if (value == null || value.isNull()) {
            return "";
        }
        String text = value.asText("");
        return text == null ? "" : text.trim();
    }

    private static double confidence(JsonNode node) {
        if (node == null || !node.isNumber()) {
            return 0.0d;
        }
        return Math.max(0.0d, Math.min(1.0d, node.asDouble()));
    }

    private int normalizeMaxNotes(Integer maxNotes) {
        if (maxNotes == null || maxNotes <= 0) {
            return properties.getMaxNotes();
        }
        return maxNotes;
    }

    private static String requireText(String value, String name) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(name + " must not be blank.");
        }
        return value.trim();
    }

    private static int tokenCount(Integer value) {
        return value == null ? 0 : Math.max(0, value);
    }

    private static long elapsedMs(Instant startedAt) {
        return Math.max(0L, Duration.between(startedAt, Instant.now()).toMillis());
    }

    private static String snippet(String text, int limit) {
        if (text == null) {
            return "";
        }
        if (text.length() <= limit) {
            return text;
        }
        return text.substring(0, Math.max(0, limit)).trim();
    }

    private static String normalizeWhitespace(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\s+", " ").trim();
    }

    @FunctionalInterface
    private interface StrategySupplier {
        AutoLinkStrategyResult get();
    }

    @FunctionalInterface
    private interface CostGetter {
        BigDecimal get(AutoLinkUsageRecord record);
    }

    private record SourceWindow(int startOffset, int endOffset, String text) {
    }

    private record VectorCandidate(
        String targetNoteId,
        String targetTitle,
        String chunkId,
        int chunkIndex,
        double vectorScore,
        String evidence
    ) {
    }

    private record NoteCard(
        String noteId,
        String title,
        List<String> tags,
        List<String> headings,
        String excerpt
    ) {
    }

    private record LlmSuggestion(
        String anchorText,
        String targetNoteId,
        String reason,
        double confidence
    ) {
    }

    private record ValidatedSuggestions(
        List<AutoLinkSuggestion> suggestions,
        int filteredInvalidAnchorCount
    ) {
    }
}
