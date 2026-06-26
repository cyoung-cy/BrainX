package com.brainx.intelligence.autolink.application.port.outbound;

import java.util.List;

import com.brainx.intelligence.shared.application.port.outbound.TokenUsagePort.TokenUsageRecord;

public interface AutoLinkUsageCapturePort {

    void begin();

    List<TokenUsageRecord> drain();
}
