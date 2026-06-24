package com.brainx.workspace.graph;

import com.brainx.workspace.entity.Note;
import com.brainx.workspace.entity.NoteLink;
import com.brainx.workspace.event.WorkspaceEvent;
import com.brainx.workspace.repository.NoteLinkRepository;
import com.brainx.workspace.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.neo4j.driver.Driver;
import org.neo4j.driver.SessionConfig;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class Neo4jGraphProjection {
    private final ObjectProvider<Driver> driverProvider;
    private final NoteRepository noteRepository;
    private final NoteLinkRepository noteLinkRepository;

    @Value("${brainx.graph.neo4j.enabled:true}")
    private boolean enabled;

    @Value("${brainx.graph.neo4j.backfill-on-startup:true}")
    private boolean backfillOnStartup;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional(readOnly = true)
    public void initializeSchema() {
        if (!enabled) {
            return;
        }
        Driver driver = driverProvider.getIfAvailable();
        if (driver == null) {
            return;
        }

        try (var session = driver.session(SessionConfig.defaultConfig())) {
            session.executeWrite(tx -> tx.run("""
                    CREATE CONSTRAINT brainx_note_identity IF NOT EXISTS
                    FOR (n:Note) REQUIRE (n.userId, n.noteId) IS UNIQUE
                    """).consume());
            session.executeWrite(tx -> tx.run("""
                    CREATE INDEX brainx_note_updated IF NOT EXISTS
                    FOR (n:Note) ON (n.userId, n.updatedAt)
                    """).consume());
            session.executeWrite(tx -> tx.run("""
                    CREATE INDEX brainx_note_folder IF NOT EXISTS
                    FOR (n:Note) ON (n.userId, n.folderId)
                    """).consume());
            session.executeWrite(tx -> tx.run("""
                    CREATE INDEX brainx_link_identity IF NOT EXISTS
                    FOR ()-[r:LINKED]-() ON (r.linkId)
                    """).consume());
            if (backfillOnStartup) {
                backfillExistingLedger(session);
            }
        } catch (Exception exception) {
            log.warn("Neo4j graph projection schema initialization failed: {}", exception.getMessage());
        }
    }

    private void backfillExistingLedger(org.neo4j.driver.Session session) {
        List<Note> notes = noteRepository.findAll();
        List<NoteLink> links = noteLinkRepository.findAll();
        session.executeWrite(tx -> {
            for (Note note : notes) {
                tx.run("""
                        MERGE (n:Note {userId: $userId, noteId: $noteId})
                        SET n.title = $title,
                            n.folderId = $folderId,
                            n.tags = $tags,
                            n.version = $version,
                            n.createdAt = $createdAt,
                            n.updatedAt = $updatedAt,
                            n.lastViewedAt = $lastViewedAt,
                            n.deleted = $deleted,
                            n.deletedAt = $deletedAt
                        """, params(
                        "userId", note.getUserId(),
                        "noteId", note.getNoteId(),
                        "title", note.getTitle(),
                        "folderId", note.getFolderId(),
                        "tags", new ArrayList<>(note.getTags()),
                        "version", note.getVersion(),
                        "createdAt", iso(note.getCreatedAt()),
                        "updatedAt", iso(note.getUpdatedAt()),
                        "lastViewedAt", note.getLastViewedAt() == null ? null : iso(note.getLastViewedAt()),
                        "deleted", note.isDeleted(),
                        "deletedAt", note.getDeletedAt() == null ? null : iso(note.getDeletedAt())
                )).consume();
            }
            for (NoteLink link : links) {
                tx.run("""
                        MERGE (source:Note {userId: $userId, noteId: $sourceNoteId})
                        ON CREATE SET source.deleted = false
                        MERGE (target:Note {userId: $userId, noteId: $targetNoteId})
                        ON CREATE SET target.deleted = false
                        MERGE (source)-[r:LINKED {linkId: $linkId}]->(target)
                        SET r.type = 'MANUAL',
                            r.source = 'USER',
                            r.weight = coalesce(r.weight, 1.0),
                            r.createdAt = coalesce(r.createdAt, $createdAt),
                            r.updatedAt = $createdAt
                        """, params(
                        "userId", link.getUserId(),
                        "sourceNoteId", link.getSourceNoteId(),
                        "targetNoteId", link.getTargetNoteId(),
                        "linkId", link.getLinkId(),
                        "createdAt", iso(link.getCreatedAt())
                )).consume();
            }
            return null;
        });
        log.info("Neo4j graph projection backfilled {} notes and {} links from Workspace ledger.", notes.size(), links.size());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void project(WorkspaceEvent event) {
        if (!enabled) {
            return;
        }
        Driver driver = driverProvider.getIfAvailable();
        if (driver == null) {
            return;
        }

        try (var session = driver.session(SessionConfig.defaultConfig())) {
            switch (event.eventType()) {
                case "NoteCreated" -> projectNoteCreated(session, event);
                case "NoteContentSaved" -> projectNoteContentSaved(session, event);
                case "NoteMetadataChanged", "NoteTagsChanged" -> projectNoteMetadataChanged(session, event);
                case "NoteViewed" -> projectNoteViewed(session, event);
                case "NoteTrashed", "NoteDeleted" -> projectNoteDeleted(session, event);
                case "NoteLinkCreated" -> projectNoteLinkCreated(session, event);
                case "NoteLinkDeleted" -> projectNoteLinkDeleted(session, event);
                default -> {
                    // This projection only cares about note graph events.
                }
            }
        } catch (Exception exception) {
            log.warn("Neo4j graph projection failed for eventType={} eventId={}: {}",
                    event.eventType(), event.eventId(), exception.getMessage());
        }
    }

    private void projectNoteCreated(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MERGE (n:Note {userId: $userId, noteId: $noteId})
                SET n.title = $title,
                    n.folderId = $folderId,
                    n.tags = $tags,
                    n.version = $version,
                    n.createdAt = coalesce(n.createdAt, $occurredAt),
                    n.updatedAt = $occurredAt,
                    n.deleted = false
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "noteId", requiredString(payload, "noteId", null),
                "title", string(payload, "title"),
                "folderId", nullableString(payload, "folderId"),
                "tags", stringList(payload, "tags"),
                "version", intValue(payload, "version"),
                "occurredAt", iso(event.occurredAt())
        )).consume());
    }

    private void projectNoteContentSaved(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MERGE (n:Note {userId: $userId, noteId: $noteId})
                SET n.version = $version,
                    n.markdownHash = $markdownHash,
                    n.updatedAt = $savedAt,
                    n.deleted = false
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "noteId", requiredString(payload, "noteId", null),
                "version", intValue(payload, "version"),
                "markdownHash", string(payload, "markdownHash"),
                "savedAt", instantString(payload.get("savedAt"), event.occurredAt())
        )).consume());
    }

    private void projectNoteMetadataChanged(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MERGE (n:Note {userId: $userId, noteId: $noteId})
                SET n.title = coalesce($title, n.title),
                    n.folderId = $folderId,
                    n.tags = coalesce($tags, n.tags),
                    n.version = coalesce($version, n.version),
                    n.updatedAt = $occurredAt,
                    n.deleted = false
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "noteId", requiredString(payload, "noteId", null),
                "title", nullableString(payload, "title"),
                "folderId", nullableString(payload, "folderId"),
                "tags", nullableStringList(payload, "tags"),
                "version", nullableInt(payload, "version"),
                "occurredAt", iso(event.occurredAt())
        )).consume());
    }

    private void projectNoteViewed(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MERGE (n:Note {userId: $userId, noteId: $noteId})
                SET n.lastViewedAt = $viewedAt
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "noteId", requiredString(payload, "noteId", null),
                "viewedAt", instantString(payload.get("viewedAt"), event.occurredAt())
        )).consume());
    }

    private void projectNoteDeleted(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MATCH (n:Note {userId: $userId, noteId: $noteId})
                SET n.deleted = true,
                    n.deletedAt = $deletedAt
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "noteId", requiredString(payload, "noteId", null),
                "deletedAt", instantString(payload.get("deletedAt"), event.occurredAt())
        )).consume());
    }

    private void projectNoteLinkCreated(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MERGE (source:Note {userId: $userId, noteId: $sourceNoteId})
                ON CREATE SET source.deleted = false
                MERGE (target:Note {userId: $userId, noteId: $targetNoteId})
                ON CREATE SET target.deleted = false
                MERGE (source)-[r:LINKED {linkId: $linkId}]->(target)
                SET r.type = $linkType,
                    r.source = CASE $linkType WHEN 'AI_SUGGESTED' THEN 'AI' ELSE 'USER' END,
                    r.weight = coalesce(r.weight, 1.0),
                    r.createdAt = coalesce(r.createdAt, $occurredAt),
                    r.updatedAt = $occurredAt
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "sourceNoteId", requiredString(payload, "sourceNoteId", null),
                "targetNoteId", requiredString(payload, "targetNoteId", null),
                "linkId", requiredString(payload, "linkId", null),
                "linkType", stringOrDefault(payload, "linkType", "MANUAL"),
                "occurredAt", iso(event.occurredAt())
        )).consume());
    }

    private void projectNoteLinkDeleted(org.neo4j.driver.Session session, WorkspaceEvent event) {
        Map<String, Object> payload = event.payload();
        session.executeWrite(tx -> tx.run("""
                MATCH (:Note {userId: $userId, noteId: $sourceNoteId})-[r:LINKED {linkId: $linkId}]->(:Note {userId: $userId, noteId: $targetNoteId})
                DELETE r
                """, params(
                "userId", requiredString(payload, "userId", event.userId()),
                "sourceNoteId", requiredString(payload, "sourceNoteId", null),
                "targetNoteId", requiredString(payload, "targetNoteId", null),
                "linkId", requiredString(payload, "linkId", null)
        )).consume());
    }

    private String requiredString(Map<String, Object> payload, String key, String fallback) {
        String value = nullableString(payload, key);
        if (value != null) {
            return value;
        }
        if (fallback != null && !fallback.isBlank()) {
            return fallback;
        }
        throw new IllegalArgumentException("Missing required graph projection field: " + key);
    }

    private Map<String, Object> params(Object... keyValues) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < keyValues.length; index += 2) {
            result.put((String) keyValues[index], keyValues[index + 1]);
        }
        return result;
    }

    private String nullableString(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value instanceof String text && !text.isBlank() ? text : null;
    }

    private String string(Map<String, Object> payload, String key) {
        String value = nullableString(payload, key);
        return value == null ? "" : value;
    }

    private String stringOrDefault(Map<String, Object> payload, String key, String fallback) {
        String value = nullableString(payload, key);
        return value == null ? fallback : value;
    }

    private int intValue(Map<String, Object> payload, String key) {
        Integer value = nullableInt(payload, key);
        return value == null ? 0 : value;
    }

    private Integer nullableInt(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof Number number) {
            return number.intValue();
        }
        return null;
    }

    private List<String> stringList(Map<String, Object> payload, String key) {
        List<String> value = nullableStringList(payload, key);
        return value == null ? List.of() : value;
    }

    private List<String> nullableStringList(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (!(value instanceof List<?> list)) {
            return null;
        }
        return list.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList();
    }

    private String instantString(Object value, Instant fallback) {
        if (value instanceof Instant instant) {
            return iso(instant);
        }
        if (value instanceof String text && !text.isBlank()) {
            return text;
        }
        return iso(fallback);
    }

    private String iso(Instant instant) {
        return instant == null ? Instant.now().toString() : instant.toString();
    }
}
