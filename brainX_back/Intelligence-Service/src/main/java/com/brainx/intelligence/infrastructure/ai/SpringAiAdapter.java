package com.brainx.intelligence.infrastructure.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import com.brainx.intelligence.shared.application.port.outbound.AiChatPort;
import com.brainx.intelligence.shared.application.port.outbound.AiEmbeddingPort;

import reactor.core.publisher.Flux;

/**
 * Spring AI bean wiring 위치를 고정하기 위한 adapter skeleton입니다.
 * 실제 AI 호출 로직은 기능 유스케이스와 도메인 테스트가 구체화된 뒤 추가합니다.
 */
@Component
public class SpringAiAdapter implements AiChatPort, AiEmbeddingPort {

    private final ObjectProvider<ChatClient.Builder> chatClientBuilderProvider;
    private final ObjectProvider<EmbeddingModel> embeddingModelProvider;

    public SpringAiAdapter(
        ObjectProvider<ChatClient.Builder> chatClientBuilderProvider,
        ObjectProvider<EmbeddingModel> embeddingModelProvider
    ) {
        this.chatClientBuilderProvider = chatClientBuilderProvider;
        this.embeddingModelProvider = embeddingModelProvider;
    }

    @Override
    public AiChatResponse generate(AiChatRequest request) {
        throw new UnsupportedOperationException("Spring AI chat generation is not implemented yet.");
    }

    @Override
    public Flux<AiChatChunk> stream(AiChatRequest request) {
        throw new UnsupportedOperationException("Spring AI chat streaming is not implemented yet.");
    }

    @Override
    public AiEmbeddingResponse embed(AiEmbeddingRequest request) {
        throw new UnsupportedOperationException("Spring AI embedding generation is not implemented yet.");
    }

    ObjectProvider<ChatClient.Builder> chatClientBuilderProvider() {
        return chatClientBuilderProvider;
    }

    ObjectProvider<EmbeddingModel> embeddingModelProvider() {
        return embeddingModelProvider;
    }
}
