package com.brainx.ingestion.service;

import com.brainx.ingestion.client.WorkspaceApiClient;
import com.brainx.ingestion.dto.request.IngestionRequest.ExtensionCaptureRequest;
import com.brainx.ingestion.dto.response.IngestionResponse.ExtensionCaptureResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

// SSOT: POST /api/v1/extension/captures (captureFromExtension)
// x-produces-events: CaptureReceived
// x-internal-sync-calls: bulkCreateNotesInternal (knowledge-workspace)
@Slf4j
@Service
@RequiredArgsConstructor
public class ExtensionCaptureService {

    private final WorkspaceApiClient workspaceApiClient;

    public ExtensionCaptureResponse capture(String userId, ExtensionCaptureRequest request, String jwtToken) {
        String markdown = buildMarkdown(request);
        String noteId = workspaceApiClient.createNote(
                request.getTitle(),
                markdown,
                request.getFolderId(),
                null,
                jwtToken
        );
        log.info("크롬 확장 캡처 저장 완료: userId={}, noteId={}, url={}", userId, noteId, request.getUrl());
        return ExtensionCaptureResponse.builder().noteId(noteId).build();
    }

    private String buildMarkdown(ExtensionCaptureRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("# ").append(req.getTitle()).append("\n\n");
        sb.append("> 출처: [").append(req.getUrl()).append("](").append(req.getUrl()).append(")\n\n");

        if (req.getSelectedText() != null && !req.getSelectedText().isBlank()) {
            sb.append(req.getSelectedText());
        } else if (req.getMetaDescription() != null && !req.getMetaDescription().isBlank()) {
            sb.append(req.getMetaDescription());
        }
        return sb.toString();
    }
}
