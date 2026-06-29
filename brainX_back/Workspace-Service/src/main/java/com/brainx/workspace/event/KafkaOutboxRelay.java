package com.brainx.workspace.event;

import com.brainx.workspace.entity.EventOutbox;
import com.brainx.workspace.repository.EventOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "brainx.events.outbox", name = "enabled", havingValue = "true")
public class KafkaOutboxRelay {
    private final EventOutboxRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${brainx.events.outbox.relay-delay-ms:2000}")
    @Transactional
    public void relayPendingEvents() {
        for (EventOutbox event : outboxRepository.findTop50ByPublishedAtIsNullOrderByOccurredAtAsc()) {
            try {
                kafkaTemplate.send(event.getChannel(), event.getUserId(), toEnvelopeJson(event)).get(5, TimeUnit.SECONDS);
                event.markPublished(Instant.now());
            } catch (Exception exception) {
                log.warn("Workspace outbox Kafka publish failed: eventId={}, channel={}, error={}",
                        event.getEventId(), event.getChannel(), exception.getMessage());
                return;
            }
        }
    }

    private String toEnvelopeJson(EventOutbox event) throws JsonProcessingException {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", event.getEventId());
        envelope.put("eventType", event.getEventType());
        envelope.put("eventVersion", event.getEventVersion());
        envelope.put("occurredAt", event.getOccurredAt());
        envelope.put("producer", event.getProducer());
        envelope.put("tenantId", event.getTenantId());
        envelope.put("userId", event.getUserId());
        envelope.put("correlationId", event.getCorrelationId());
        envelope.put("causationId", event.getCausationId());
        envelope.put("idempotencyKey", event.getIdempotencyKey());
        envelope.put("payload", objectMapper.readTree(event.getPayloadJson()));
        return objectMapper.writeValueAsString(envelope);
    }
}
