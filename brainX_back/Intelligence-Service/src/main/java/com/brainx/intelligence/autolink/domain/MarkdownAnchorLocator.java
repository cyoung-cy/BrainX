package com.brainx.intelligence.autolink.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public class MarkdownAnchorLocator {

    public Optional<AnchorRange> locate(String markdown, String anchorText) {
        if (markdown == null || markdown.isBlank() || anchorText == null || anchorText.isBlank()) {
            return Optional.empty();
        }
        String anchor = anchorText.trim();
        List<TextRange> excludedRanges = excludedRanges(markdown);
        Optional<AnchorRange> exact = locate(markdown, anchor, excludedRanges, false);
        return exact.isPresent() ? exact : locate(markdown, anchor, excludedRanges, true);
    }

    private Optional<AnchorRange> locate(
        String markdown,
        String anchor,
        List<TextRange> excludedRanges,
        boolean ignoreCase
    ) {
        String haystack = ignoreCase ? markdown.toLowerCase(Locale.ROOT) : markdown;
        String needle = ignoreCase ? anchor.toLowerCase(Locale.ROOT) : anchor;
        int start = haystack.indexOf(needle);
        while (start >= 0) {
            int end = start + anchor.length();
            if (!insideExcludedRange(start, end, excludedRanges)) {
                return Optional.of(toAnchorRange(markdown, start, end));
            }
            start = haystack.indexOf(needle, start + 1);
        }
        return Optional.empty();
    }

    private static AnchorRange toAnchorRange(String markdown, int start, int end) {
        Position startPosition = position(markdown, start);
        Position endPosition = position(markdown, end);
        return new AnchorRange(
            start,
            end,
            startPosition.line(),
            startPosition.column(),
            endPosition.line(),
            endPosition.column(),
            markdown.substring(start, end)
        );
    }

    private static Position position(String text, int offset) {
        int line = 1;
        int column = 1;
        int safeOffset = Math.max(0, Math.min(offset, text.length()));
        for (int index = 0; index < safeOffset; index++) {
            char current = text.charAt(index);
            if (current == '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
        return new Position(line, column);
    }

    private static boolean insideExcludedRange(int start, int end, List<TextRange> ranges) {
        for (TextRange range : ranges) {
            if (start < range.end() && end > range.start()) {
                return true;
            }
        }
        return false;
    }

    private static List<TextRange> excludedRanges(String markdown) {
        List<TextRange> ranges = new ArrayList<>();
        addFencedCodeRanges(markdown, ranges);
        addInlineCodeRanges(markdown, ranges);
        addMarkdownLinkRanges(markdown, ranges);
        addWikiLinkRanges(markdown, ranges);
        return ranges.stream()
            .sorted(Comparator.comparingInt(TextRange::start))
            .toList();
    }

    private static void addFencedCodeRanges(String markdown, List<TextRange> ranges) {
        int lineStart = 0;
        int fenceStart = -1;
        while (lineStart <= markdown.length()) {
            int lineEnd = markdown.indexOf('\n', lineStart);
            int nextLineStart = lineEnd < 0 ? markdown.length() + 1 : lineEnd + 1;
            String line = markdown.substring(lineStart, lineEnd < 0 ? markdown.length() : lineEnd).trim();
            if (line.startsWith("```")) {
                if (fenceStart < 0) {
                    fenceStart = lineStart;
                } else {
                    ranges.add(new TextRange(fenceStart, nextLineStart - 1));
                    fenceStart = -1;
                }
            }
            if (lineEnd < 0) {
                break;
            }
            lineStart = nextLineStart;
        }
        if (fenceStart >= 0) {
            ranges.add(new TextRange(fenceStart, markdown.length()));
        }
    }

    private static void addInlineCodeRanges(String markdown, List<TextRange> ranges) {
        int start = markdown.indexOf('`');
        while (start >= 0) {
            if (startsWith(markdown, start, "```")) {
                start = markdown.indexOf('`', start + 3);
                continue;
            }
            int end = markdown.indexOf('`', start + 1);
            if (end < 0) {
                return;
            }
            ranges.add(new TextRange(start, end + 1));
            start = markdown.indexOf('`', end + 1);
        }
    }

    private static void addMarkdownLinkRanges(String markdown, List<TextRange> ranges) {
        int start = markdown.indexOf('[');
        while (start >= 0) {
            if (startsWith(markdown, start, "[[")) {
                start = markdown.indexOf('[', start + 2);
                continue;
            }
            int closeBracket = markdown.indexOf(']', start + 1);
            if (closeBracket > start && closeBracket + 1 < markdown.length() && markdown.charAt(closeBracket + 1) == '(') {
                int closeParen = markdown.indexOf(')', closeBracket + 2);
                if (closeParen > closeBracket) {
                    ranges.add(new TextRange(start, closeParen + 1));
                    start = markdown.indexOf('[', closeParen + 1);
                    continue;
                }
            }
            start = markdown.indexOf('[', start + 1);
        }
    }

    private static void addWikiLinkRanges(String markdown, List<TextRange> ranges) {
        int start = markdown.indexOf("[[");
        while (start >= 0) {
            int end = markdown.indexOf("]]", start + 2);
            if (end < 0) {
                return;
            }
            ranges.add(new TextRange(start, end + 2));
            start = markdown.indexOf("[[", end + 2);
        }
    }

    private static boolean startsWith(String text, int offset, String prefix) {
        return offset >= 0
            && offset + prefix.length() <= text.length()
            && text.startsWith(prefix, offset);
    }

    public record AnchorRange(
        int startOffset,
        int endOffset,
        int startLine,
        int startColumn,
        int endLine,
        int endColumn,
        String matchedText
    ) {
    }

    private record TextRange(int start, int end) {
    }

    private record Position(int line, int column) {
    }
}
