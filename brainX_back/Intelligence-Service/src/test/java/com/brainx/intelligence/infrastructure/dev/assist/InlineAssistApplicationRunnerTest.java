package com.brainx.intelligence.infrastructure.dev.assist;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.brainx.intelligence.assist.application.port.inbound.CreateInlineAssistUseCase;
import com.brainx.intelligence.assist.application.port.inbound.CreateInlineAssistUseCase.InlineAssistCommand;
import com.brainx.intelligence.assist.application.port.inbound.CreateInlineAssistUseCase.InlineAssistResult;
import com.brainx.intelligence.assist.domain.InlineAssistAction;
import com.fasterxml.jackson.databind.ObjectMapper;

class InlineAssistApplicationRunnerTest {

    @Test
    void propertyScenarioWritesJsonResponse() throws Exception {
        InlineAssistDevProperties properties = properties();
        properties.setAction("rewrite");
        properties.setSelectedText("이 문장은 조금 어색합니다.");
        FakeUseCase useCase = new FakeUseCase();
        InlineAssistApplicationRunner runner = runner(properties, useCase);
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        runner.runAssist(
            new BufferedReader(new StringReader("")),
            new PrintStream(output, true, StandardCharsets.UTF_8)
        );

        String json = output.toString(StandardCharsets.UTF_8);
        assertThat(json).contains("\"scenarioId\" : \"property\"");
        assertThat(json).contains("\"action\" : \"REWRITE\"");
        assertThat(json).contains("\"text\" : \"result for REWRITE\"");
        assertThat(useCase.commands).hasSize(1);
        assertThat(useCase.commands.getFirst().selectedText()).isEqualTo("이 문장은 조금 어색합니다.");
    }

    @Test
    void stdinJsonlRunsMultipleActionsUntilExit() throws Exception {
        InlineAssistDevProperties properties = properties();
        FakeUseCase useCase = new FakeUseCase();
        InlineAssistApplicationRunner runner = runner(properties, useCase);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        String input = """
            {"id":"sum","action":"SUMMARIZE","selectedText":"충분히 긴 선택 영역입니다. 내용을 간단히 요약해야 합니다."}
            {"id":"trans","action":"TRANSLATE","selectedText":"Translate this sentence.","language":"ko"}
            exit
            """;

        runner.runAssist(
            new BufferedReader(new StringReader(input)),
            new PrintStream(output, true, StandardCharsets.UTF_8)
        );

        String text = output.toString(StandardCharsets.UTF_8);
        assertThat(text).contains("brainx-inline-assist> ");
        assertThat(text).contains("\"scenarioId\" : \"sum\"");
        assertThat(text).contains("\"scenarioId\" : \"trans\"");
        assertThat(useCase.commands).extracting(InlineAssistCommand::action)
            .containsExactly(InlineAssistAction.SUMMARIZE, InlineAssistAction.TRANSLATE);
    }

    @Test
    void unsupportedCommandFailsFast() {
        InlineAssistDevProperties properties = properties();
        properties.setCommand("bad");
        InlineAssistApplicationRunner runner = runner(properties, new FakeUseCase());

        assertThatThrownBy(() -> runner.runAssist(
            new BufferedReader(new StringReader("")),
            new PrintStream(new ByteArrayOutputStream(), true, StandardCharsets.UTF_8)
        )).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unsupported inline assist command");
    }

    private static InlineAssistApplicationRunner runner(
        InlineAssistDevProperties properties,
        CreateInlineAssistUseCase useCase
    ) {
        return new InlineAssistApplicationRunner(
            properties,
            useCase,
            new ObjectMapper().findAndRegisterModules(),
            null
        );
    }

    private static InlineAssistDevProperties properties() {
        InlineAssistDevProperties properties = new InlineAssistDevProperties();
        properties.setUserId("user-1");
        properties.setNoteId("note-1");
        return properties;
    }

    private static final class FakeUseCase implements CreateInlineAssistUseCase {

        private final List<InlineAssistCommand> commands = new ArrayList<>();

        @Override
        public InlineAssistResult createInlineAssist(InlineAssistCommand command) {
            commands.add(command);
            return new InlineAssistResult(
                "suggestion-" + commands.size(),
                command.action(),
                "gpt-test",
                "result for " + command.action()
            );
        }
    }
}
