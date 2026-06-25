package com.brainx.intelligence.infrastructure.dev.autolink;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import com.brainx.intelligence.autolink.application.port.outbound.AutoLinkUsageCapturePort;
import com.brainx.intelligence.infrastructure.events.NoOpIntelligenceEventAdapter;
import com.brainx.intelligence.infrastructure.events.producer.KafkaIntelligenceEventAdapter;
import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort;

@Component
@Primary
@ConditionalOnProperty(prefix = "brainx.dev.note-auto-link", name = "enabled", havingValue = "true")
class NoteAutoLinkTokenUsageRecorder implements TokenUsagePort, AutoLinkUsageCapturePort {

    private static final ThreadLocal<List<TokenUsageRecord>> CURRENT_RECORDS =
        ThreadLocal.withInitial(ArrayList::new);

    private final ObjectProvider<KafkaIntelligenceEventAdapter> kafkaAdapterProvider;
    private final ObjectProvider<NoOpIntelligenceEventAdapter> noOpAdapterProvider;

    NoteAutoLinkTokenUsageRecorder(
        ObjectProvider<KafkaIntelligenceEventAdapter> kafkaAdapterProvider,
        ObjectProvider<NoOpIntelligenceEventAdapter> noOpAdapterProvider
    ) {
        this.kafkaAdapterProvider = kafkaAdapterProvider;
        this.noOpAdapterProvider = noOpAdapterProvider;
    }

    @Override
    public void begin() {
        CURRENT_RECORDS.get().clear();
    }

    @Override
    public List<TokenUsageRecord> drain() {
        List<TokenUsageRecord> records = List.copyOf(CURRENT_RECORDS.get());
        CURRENT_RECORDS.remove();
        return records;
    }

    @Override
    public void recordTokenUsage(TokenUsageRecord record) {
        CURRENT_RECORDS.get().add(record);
        TokenUsagePort delegate = delegate();
        if (delegate != null) {
            delegate.recordTokenUsage(record);
        }
    }

    private TokenUsagePort delegate() {
        KafkaIntelligenceEventAdapter kafkaAdapter = kafkaAdapterProvider.getIfAvailable();
        if (kafkaAdapter != null) {
            return kafkaAdapter;
        }
        return noOpAdapterProvider.getIfAvailable();
    }
}
