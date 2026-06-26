package com.brainx.ingestion.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class IngestionRequest {

    @Getter
    @NoArgsConstructor
    public static class NotionOAuthAuthorizeRequest {
        @NotBlank(message = "redirectUri는 필수입니다")
        private String redirectUri;
    }

    @Getter
    @NoArgsConstructor
    public static class NotionOAuthCallbackRequest {
        @NotBlank(message = "code는 필수입니다")
        private String code;
        @NotBlank(message = "state는 필수입니다")
        private String state;
    }

    @Getter
    @NoArgsConstructor
    public static class NotionImportJobRequest {
        @NotBlank(message = "integrationAccountId는 필수입니다")
        private String integrationAccountId;
        @NotBlank(message = "sourceId는 필수입니다")
        private String sourceId;
        private String mode = "IMPORT";
        private String targetFolderId;
    }

    @Getter
    @NoArgsConstructor
    public static class ObsidianImportJobRequest {
        @NotBlank(message = "uploadedZipAssetId는 필수입니다")
        private String uploadedZipAssetId;
        private String targetFolderId;
    }

    @Getter
    @NoArgsConstructor
    public static class AssetUploadSessionCreateRequest {
        @NotBlank(message = "fileName은 필수입니다")
        private String fileName;
        @NotBlank(message = "contentType은 필수입니다")
        private String contentType;
        @jakarta.validation.constraints.Min(value = 1, message = "sizeBytes는 1 이상이어야 합니다")
        private long sizeBytes;
        private String targetNoteId;
    }

    @Getter
    @NoArgsConstructor
    public static class AssetUploadCompleteRequest {
        @NotBlank(message = "checksum은 필수입니다")
        private String checksum;
        @NotBlank(message = "conversionMode는 필수입니다")
        private String conversionMode;
    }

    @Getter
    @NoArgsConstructor
    public static class FileImportJobRequest {
        @NotBlank(message = "uploadedAssetId는 필수입니다")
        private String uploadedAssetId;
        private String targetFolderId;
    }

    @Getter
    @NoArgsConstructor
    public static class ExportJobRequest {
        @NotBlank(message = "noteId는 필수입니다")
        private String noteId;
        @NotBlank(message = "format은 필수입니다")
        private String format;
        private String clientType = "WEB";
    }

    @Getter
    @NoArgsConstructor
    public static class PublishJobRequest {
        @NotBlank(message = "noteId는 필수입니다")
        private String noteId;
        @NotBlank(message = "platform은 필수입니다")
        private String platform;
        private String templateId;
        private String noteContent;
    }

    @Getter
    @NoArgsConstructor
    public static class ExtensionCaptureRequest {
        @NotBlank(message = "url은 필수입니다")
        private String url;
        @NotBlank(message = "title은 필수입니다")
        private String title;
        private String selectedText;
        private String metaDescription;
        private String folderId;
    }
}
