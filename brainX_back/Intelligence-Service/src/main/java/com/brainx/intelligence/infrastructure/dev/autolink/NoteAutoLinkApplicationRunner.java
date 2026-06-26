package com.brainx.intelligence.infrastructure.dev.autolink;

import java.io.IOException;
import java.io.PrintStream;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase;
import com.brainx.intelligence.autolink.application.port.inbound.NoteAutoLinkUseCase.AutoLinkCommand;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(prefix = "brainx.dev.note-auto-link", name = "enabled", havingValue = "true")
public class NoteAutoLinkApplicationRunner implements ApplicationRunner {

    private final NoteAutoLinkDevProperties properties;
    private final NoteAutoLinkUseCase noteAutoLinkUseCase;
    private final ObjectMapper objectMapper;
    private final ConfigurableApplicationContext applicationContext;

    public NoteAutoLinkApplicationRunner(
        NoteAutoLinkDevProperties properties,
        NoteAutoLinkUseCase noteAutoLinkUseCase,
        ObjectMapper objectMapper,
        ConfigurableApplicationContext applicationContext
    ) {
        this.properties = properties;
        this.noteAutoLinkUseCase = noteAutoLinkUseCase;
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        runAnalyze(System.out);
        exitSuccessfully();
    }

    void runAnalyze(PrintStream out) throws IOException {
        String command = StringUtils.hasText(properties.getCommand())
            ? properties.getCommand().trim().toLowerCase()
            : "analyze";
        if (!command.equals("analyze")) {
            throw new IllegalArgumentException("Unsupported note auto-link command: " + properties.getCommand());
        }
        writeJson(out, noteAutoLinkUseCase.analyze(new AutoLinkCommand(
            properties.getUserId(),
            properties.getDocumentGroupId(),
            properties.getStrategy(),
            properties.getMaxNotes() <= 0 ? null : properties.getMaxNotes(),
            properties.getModelId()
        )));
    }

    private void writeJson(PrintStream out, Object value) throws IOException {
        out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(value));
    }

    private void exitSuccessfully() {
        System.out.flush();
        System.err.flush();
        int exitCode = SpringApplication.exit(applicationContext, () -> 0);
        System.exit(exitCode);
    }
}
