package com.brainx.intelligence.infrastructure.events.folder;

import java.util.Optional;

public interface FolderProjectionStore {

    Optional<FolderProjection> findByFolderId(String folderId);

    FolderProjection save(FolderProjection projection);
}
