package com.brainx.intelligence.infrastructure.dev.chatrouter;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

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
import com.brainx.intelligence.infrastructure.dev.rag.SampleRagProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import reactor.core.publisher.Flux;

class ChatRouterApplicationRunnerTest {

    @Test
    void singleQueryWritesRouteAnswerAndCitationJson() throws Exception {
        ChatRouterDevProperties properties = properties();
        properties.setQuery("내 노트에서 RAG 찾아줘");
        FakeCreateChatThreadUseCase create = new FakeCreateChatThreadUseCase();
        FakeSendChatMessageUseCase send = new FakeSendChatMessageUseCase();
        FakeGetChatThreadUseCase get = new FakeGetChatThreadUseCase();
        ChatRouterApplicationRunner runner = runner(properties, create, send, get);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        runner.runChat(
            new BufferedReader(new StringReader("")),
            new PrintStream(output, true, StandardCharsets.UTF_8)
        );

        String json = output.toString(StandardCharsets.UTF_8);
        assertThat(json).contains("\"query\" : \"내 노트에서 RAG 찾아줘\"");
        assertThat(json).contains("\"routerModel\" : \"gpt-5.4-nano\"");
        assertThat(json).contains("\"route\" : \"WORKSPACE_SEARCH\"");
        assertThat(json).contains("\"answer\" : \"답변 완료\"");
        assertThat(json).contains("\"noteId\" : \"note-1\"");
        assertThat(create.commands).hasSize(1);
        assertThat(create.commands.getFirst().documentGroupId()).isEqualTo("group-1");
        assertThat(send.commands).hasSize(1);
        assertThat(send.commands.getFirst().clientContext()).containsEntry("source", "WORKSPACE_CHAT");
        assertThat(get.queries).hasSize(1);
    }

    @Test
    void stdinLoopHandlesMultipleQueriesUntilExit() throws Exception {
        ChatRouterDevProperties properties = properties();
        FakeCreateChatThreadUseCase create = new FakeCreateChatThreadUseCase();
        FakeSendChatMessageUseCase send = new FakeSendChatMessageUseCase();
        FakeGetChatThreadUseCase get = new FakeGetChatThreadUseCase();
        ChatRouterApplicationRunner runner = runner(properties, create, send, get);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        runner.runChat(
            new BufferedReader(new StringReader("first\n\nsecond\nexit\n")),
            new PrintStream(output, true, StandardCharsets.UTF_8)
        );

        String text = output.toString(StandardCharsets.UTF_8);
        assertThat(text).contains("brainx-chat-router> ");
        assertThat(text).contains("\"query\" : \"first\"");
        assertThat(text).contains("\"query\" : \"second\"");
        assertThat(send.commands).extracting(SendChatMessageCommand::message)
            .containsExactly("first", "second");
    }

    private static ChatRouterApplicationRunner runner(
        ChatRouterDevProperties properties,
        CreateChatThreadUseCase create,
        SendChatMessageUseCase send,
        GetChatThreadUseCase get
    ) {
        return new ChatRouterApplicationRunner(
            properties,
            new SampleRagProperties(),
            null,
            create,
            send,
            get,
            new ObjectMapper().findAndRegisterModules(),
            null
        );
    }

    private static ChatRouterDevProperties properties() {
        ChatRouterDevProperties properties = new ChatRouterDevProperties();
        properties.setUserId("user-1");
        properties.setDocumentGroupId("group-1");
        properties.setModelId("gpt-test");
        return properties;
    }

    private static final class FakeCreateChatThreadUseCase implements CreateChatThreadUseCase {

        private final List<CreateChatThreadCommand> commands = new ArrayList<>();

        @Override
        public ChatThreadResult createChatThread(CreateChatThreadCommand command) {
            commands.add(command);
            return new ChatThreadResult(
                "thread-" + commands.size(),
                command.documentGroupId(),
                command.title(),
                command.modelId(),
                Instant.parse("2026-06-24T00:00:00Z")
            );
        }
    }

    private static final class FakeSendChatMessageUseCase implements SendChatMessageUseCase {

        private final List<SendChatMessageCommand> commands = new ArrayList<>();

        @Override
        public Flux<ChatStreamEvent> sendChatMessage(SendChatMessageCommand command) {
            commands.add(command);
            return Flux.just(
                ChatStreamEvent.route("WORKSPACE_SEARCH", "search notes", "gpt-5.4-nano"),
                ChatStreamEvent.delta("답변 "),
                ChatStreamEvent.delta("완료"),
                ChatStreamEvent.done("assistant-1")
            );
        }
    }

    private static final class FakeGetChatThreadUseCase implements GetChatThreadUseCase {

        private final List<GetChatThreadQuery> queries = new ArrayList<>();

        @Override
        public ChatThreadDetailResult getChatThread(GetChatThreadQuery query) {
            queries.add(query);
            return new ChatThreadDetailResult(
                new ThreadView(query.threadId(), "group-1", "title", "gpt-test", Instant.parse("2026-06-24T00:00:00Z")),
                List.of(Map.of(
                    "messageId", "assistant-1",
                    "role", "ASSISTANT",
                    "content", "답변 완료",
                    "citations", List.of(Map.of(
                        "noteId", "note-1",
                        "title", "RAG note",
                        "score", 0.91d
                    ))
                ))
            );
        }
    }
}
