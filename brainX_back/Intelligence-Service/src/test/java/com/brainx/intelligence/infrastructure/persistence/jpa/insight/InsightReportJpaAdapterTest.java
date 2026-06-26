package com.brainx.intelligence.infrastructure.persistence.jpa.insight;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import com.brainx.intelligence.insight.domain.InsightRecommendation;
import com.brainx.intelligence.insight.domain.InsightReport;
import com.brainx.intelligence.insight.domain.InsightReportStatus;
import com.fasterxml.jackson.databind.ObjectMapper;

@DataJpaTest
@ActiveProfiles("test")
@Import({InsightReportJpaAdapter.class, InsightReportJpaAdapterTest.ObjectMapperConfig.class})
class InsightReportJpaAdapterTest {

    @Autowired
    private InsightReportJpaAdapter adapter;

    @Test
    void saveAndFindPreservesJsonFieldsAndIdempotencyKey() {
        InsightReport saved = adapter.save(new InsightReport(
            "report-1",
            "user-1",
            "group-1",
            InsightReportStatus.COMPLETED,
            Map.of("documentGroupId", "group-1", "maxNotes", 10),
            true,
            "summary",
            List.of("gap"),
            List.of(new InsightRecommendation("CONNECT", "title", "reason", List.of("note-1"), "HIGH")),
            "gpt-test",
            "idem-1",
            null,
            Instant.parse("2026-06-26T00:00:00Z"),
            Instant.parse("2026-06-26T00:00:01Z")
        ));

        assertThat(saved.reportId()).isEqualTo("report-1");

        var found = adapter.findByUserIdAndReportId("user-1", "report-1").orElseThrow();
        var byIdempotency = adapter.findByUserIdAndIdempotencyKey("user-1", "idem-1").orElseThrow();

        assertThat(found.documentGroupId()).isEqualTo("group-1");
        assertThat(found.includeLearningRecommendations()).isTrue();
        assertThat(found.scope()).containsEntry("documentGroupId", "group-1");
        assertThat(found.knowledgeGaps()).containsExactly("gap");
        assertThat(found.recommendations()).hasSize(1);
        assertThat(found.recommendations().getFirst().noteIds()).containsExactly("note-1");
        assertThat(byIdempotency.reportId()).isEqualTo("report-1");
    }

    static class ObjectMapperConfig {
        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper().findAndRegisterModules();
        }
    }
}
