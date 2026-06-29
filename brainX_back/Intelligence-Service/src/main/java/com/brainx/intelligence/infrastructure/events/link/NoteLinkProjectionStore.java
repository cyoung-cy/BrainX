package com.brainx.intelligence.infrastructure.events.link;

import java.util.Optional;

public interface NoteLinkProjectionStore {

    Optional<NoteLinkProjection> findByLinkId(String linkId);

    NoteLinkProjection save(NoteLinkProjection projection);
}
