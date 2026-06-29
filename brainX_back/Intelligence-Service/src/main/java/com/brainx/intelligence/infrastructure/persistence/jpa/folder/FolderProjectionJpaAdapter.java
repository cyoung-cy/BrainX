package com.brainx.intelligence.infrastructure.persistence.jpa.folder;

import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.brainx.intelligence.infrastructure.events.folder.FolderProjection;
import com.brainx.intelligence.infrastructure.events.folder.FolderProjectionStore;

@Repository
public class FolderProjectionJpaAdapter implements FolderProjectionStore {

    private final FolderProjectionJpaRepository repository;

    public FolderProjectionJpaAdapter(FolderProjectionJpaRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FolderProjection> findByFolderId(String folderId) {
        return repository.findById(folderId).map(FolderProjectionJpaEntity::toDomain);
    }

    @Override
    @Transactional
    public FolderProjection save(FolderProjection projection) {
        return repository.save(FolderProjectionJpaEntity.fromDomain(projection)).toDomain();
    }
}
