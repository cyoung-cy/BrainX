package com.brainx.intelligence.insight.application.port.outbound;

import java.util.Map;

public interface InsightEventPort {

    void insightReportRequested(InsightReportRequestedEvent event);

    void insightReportCompleted(InsightReportCompletedEvent event);

    record InsightReportRequestedEvent(
        String userId,
        String reportId,
        Map<String, Object> scope,
        boolean includeLearningRecommendations
    ) {
    }

    record InsightReportCompletedEvent(
        String userId,
        String reportId,
        int knowledgeGapCount,
        int recommendationCount
    ) {
    }
}
