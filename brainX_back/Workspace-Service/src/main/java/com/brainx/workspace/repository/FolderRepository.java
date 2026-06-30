package com.brainx.workspace.repository;

import com.brainx.workspace.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, String> {
    Optional<Folder> findByFolderIdAndUserId(String folderId, String userId);
    List<Folder> findByUserIdOrderByNameAsc(String userId);

    /** 같은 depth(parentFolderId)의 형제 폴더만 조회 — derived query의 "= :param"은 NULL(루트)을
        매치하지 못해 직접 JPQL로 null/non-null 양쪽을 처리한다. */
    @Query("SELECT f FROM Folder f WHERE f.userId = :userId AND " +
            "((:parentFolderId IS NULL AND f.parentFolderId IS NULL) OR f.parentFolderId = :parentFolderId)")
    List<Folder> findSiblingsByUserIdAndParentFolderId(@Param("userId") String userId, @Param("parentFolderId") String parentFolderId);
}
