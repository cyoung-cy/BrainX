package com.brainx.ingestion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "import_jobs", indexes = {
        @Index(name = "idx_import_jobs_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "import_job_id", length = 36)
    private String importJobId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SourceType sourceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private JobStatus status = JobStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 20)
    private ImportMode mode;

    @Column(name = "integration_account_id", length = 36)
    private String integrationAccountId;

    @Column(name = "source_id", length = 500)
    private String sourceId;

    @Column(name = "target_folder_id", length = 36)
    private String targetFolderId;

    // OBSIDIAN(ZIP)뿐 아니라 FILE(단일 파일) 가져오기에도 업로드된 asset id로 재사용한다.
    @Column(name = "uploaded_zip_asset_id", length = 200)
    private String uploadedZipAssetId;

    // ZIP 가져오기는 파일 수가 많으면 콤마로 이어붙인 note id 목록이 쉽게 2000자를 넘으므로
    // varchar 길이 제한 없는 TEXT로 저장한다.
    @Column(name = "created_note_ids", columnDefinition = "TEXT")
    private String createdNoteIds;

    @Column(name = "failed_files", columnDefinition = "TEXT")
    private String failedFiles;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SourceType {
        NOTION, OBSIDIAN, FILE
    }

    public enum JobStatus {
        PENDING, PROCESSING, COMPLETED, FAILED
    }

    public enum ImportMode {
        IMPORT, FORK, SYNC
    }
}
