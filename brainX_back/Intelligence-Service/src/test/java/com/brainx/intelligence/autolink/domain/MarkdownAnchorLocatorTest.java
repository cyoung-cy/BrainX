package com.brainx.intelligence.autolink.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class MarkdownAnchorLocatorTest {

    private final MarkdownAnchorLocator locator = new MarkdownAnchorLocator();

    @Test
    void locatesOffsetAndLineColumnFromRawMarkdown() {
        String markdown = "# Title\n\nfirst line\nsecond target text";

        var range = locator.locate(markdown, "target text").orElseThrow();

        assertThat(range.startOffset()).isEqualTo(markdown.indexOf("target text"));
        assertThat(range.endOffset()).isEqualTo(range.startOffset() + "target text".length());
        assertThat(range.startLine()).isEqualTo(4);
        assertThat(range.startColumn()).isEqualTo(8);
        assertThat(range.endLine()).isEqualTo(4);
        assertThat(range.endColumn()).isEqualTo(19);
        assertThat(range.matchedText()).isEqualTo("target text");
    }

    @Test
    void skipsExistingLinksWikiLinksAndCodeFences() {
        String markdown = """
            [Target](note.md)
            [[Target]]
            ```
            Target
            ```
            plain Target
            """;

        var range = locator.locate(markdown, "Target").orElseThrow();

        assertThat(range.matchedText()).isEqualTo("Target");
        assertThat(range.startLine()).isEqualTo(6);
    }

    @Test
    void returnsEmptyWhenAnchorOnlyExistsInsideExcludedRange() {
        String markdown = """
            `Target`
            [Target](note.md)
            [[Target]]
            """;

        assertThat(locator.locate(markdown, "Target")).isEmpty();
    }
}
