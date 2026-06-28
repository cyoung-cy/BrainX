package com.brainx.intelligence.infrastructure.events.capture;

import java.util.Optional;

public interface CaptureProjectionStore {

    Optional<CaptureProjection> findByCaptureId(String captureId);

    CaptureProjection save(CaptureProjection projection);
}
