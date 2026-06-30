package com.brainx.workspace.repository;

import com.brainx.workspace.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NoteRepository extends JpaRepository<Note, String> {
    Optional<Note> findByNoteIdAndUserId(String noteId, String userId);
    List<Note> findByUserIdOrderByUpdatedAtDesc(String userId);
    List<Note> findByUserIdAndDeletedFalseOrderByUpdatedAtDesc(String userId);
    List<Note> findByUserIdAndFolderIdAndDeletedFalse(String userId, String folderId);
    List<Note> findByUserIdAndFolderIdIn(String userId, Collection<String> folderIds);
    Optional<Note> findFirstByUserIdAndTitleAndDeletedFalse(String userId, String title);
    /** 같은 folderId(루트면 null) 안의, 삭제되지 않은 형제 노트만 조회 — derived query의
        "= :param"은 NULL(루트)을 매치하지 못해 직접 JPQL로 null/non-null 양쪽을 처리한다. */
    @Query("SELECT n FROM Note n WHERE n.userId = :userId AND n.deleted = false AND " +
            "((:folderId IS NULL AND n.folderId IS NULL) OR n.folderId = :folderId)")
    List<Note> findSiblingsByUserIdAndFolderId(@Param("userId") String userId, @Param("folderId") String folderId);
    long countByUserIdAndDeletedFalse(String userId);
    List<Note> findTop5ByUserIdAndDeletedFalseOrderByUpdatedAtDesc(String userId);
}
