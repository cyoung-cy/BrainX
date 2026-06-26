package com.brainx.intelligence.autolink.application.port.outbound;

import java.time.Instant;
import java.util.List;

public interface AutoLinkNoteSourcePort {

    List<AutoLinkNoteSource> findSearchableNoteSources(String userId, String documentGroupId, int limit);

    record AutoLinkNoteSource(
        String userId,
        String documentGroupId,
        String noteId,
        String title,
        List<String> tags,
        String markdownHash,
        String markdown,
        Instant updatedAt
    ) {
        public AutoLinkNoteSource {
            title = title == null ? "" : title;
            tags = tags == null ? List.of() : List.copyOf(tags);
            markdown = markdown == null || markdown.isBlank() ? null : markdown;
        }
    }
}
