package com.brainx.workspace.service;

import com.brainx.workspace.dto.WorkspaceDtos.NoteDraftFlushData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NoteDraftFlushScheduler {
    private final NoteDraftPersistenceService noteDraftPersistenceService;

    @Scheduled(
            fixedDelayString = "${brainx.workspace.draft.flush-interval-seconds:30}000",
            initialDelayString = "${brainx.workspace.draft.flush-interval-seconds:30}000"
    )
    public void flushIdleUserDrafts() {
        try {
            NoteDraftFlushData result = noteDraftPersistenceService.flushIdleUserDrafts();
            if (result.flushedCount() > 0 || result.skippedCount() > 0) {
                log.info("[draft-flush-scheduler] status=cycle-finished flushedCount={} skippedCount={}",
                        result.flushedCount(), result.skippedCount());
            }
        } catch (Exception exception) {
            log.warn("[draft-flush-scheduler] status=failed reason={}",
                    exception.getClass().getSimpleName(), exception);
        }
    }
}
