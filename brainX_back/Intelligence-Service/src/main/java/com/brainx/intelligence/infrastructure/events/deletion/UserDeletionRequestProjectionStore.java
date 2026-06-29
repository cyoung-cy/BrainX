package com.brainx.intelligence.infrastructure.events.deletion;

import java.util.Optional;

public interface UserDeletionRequestProjectionStore {

    Optional<UserDeletionRequestProjection> findByUserId(String userId);

    UserDeletionRequestProjection save(UserDeletionRequestProjection projection);
}
