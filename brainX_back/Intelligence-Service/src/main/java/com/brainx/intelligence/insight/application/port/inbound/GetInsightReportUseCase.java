package com.brainx.intelligence.insight.application.port.inbound;

import com.brainx.intelligence.insight.domain.InsightReport;

public interface GetInsightReportUseCase {

    InsightReport getInsightReport(GetInsightReportQuery query);

    record GetInsightReportQuery(
        String userId,
        String reportId
    ) {
    }
}
