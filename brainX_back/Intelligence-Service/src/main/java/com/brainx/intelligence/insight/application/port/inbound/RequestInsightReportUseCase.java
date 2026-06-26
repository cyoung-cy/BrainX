package com.brainx.intelligence.insight.application.port.inbound;

import java.util.Map;

import com.brainx.intelligence.insight.domain.InsightReport;

public interface RequestInsightReportUseCase {

    InsightReport requestInsightReport(InsightReportCommand command);

    record InsightReportCommand(
        String userId,
        Map<String, Object> scope,
        Boolean includeLearningRecommendations,
        String idempotencyKey
    ) {
    }
}
