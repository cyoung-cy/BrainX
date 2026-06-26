package com.brainx.intelligence.infrastructure.events.note;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

import com.brainx.intelligence.exploration.domain.NoteSearchDocument;

final class NoteChunkIndexHasher {

    private NoteChunkIndexHasher() {
    }

    static String embeddingTextHash(String chunkText) {
        return sha256Hex(chunkText == null ? "" : chunkText);
    }

    static String embeddingTextHash(NoteSearchDocument document) {
        return embeddingTextHash(document.chunkText());
    }

    static String payloadHash(NoteSearchDocument document) {
        StringBuilder builder = new StringBuilder();
        append(builder, document.userId());
        append(builder, document.documentGroupId());
        append(builder, document.noteId());
        append(builder, document.chunkId());
        append(builder, Integer.toString(document.chunkIndex()));
        append(builder, document.title());
        append(builder, document.excerpt());
        append(builder, document.chunkText());
        append(builder, document.keywordIds());
        append(builder, document.markdownHash());
        append(builder, document.version() == null ? null : document.version().toString());
        append(builder, document.sourcePath());
        append(builder, document.sourceFilename());
        return sha256Hex(builder.toString());
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    private static void append(StringBuilder builder, String value) {
        if (value == null) {
            builder.append("-1:");
            return;
        }
        builder.append(value.length()).append(':').append(value);
    }

    private static void append(StringBuilder builder, List<String> values) {
        if (values == null) {
            builder.append("-1:");
            return;
        }
        builder.append(values.size()).append('[');
        for (String value : values) {
            append(builder, value);
        }
        builder.append(']');
    }
}
