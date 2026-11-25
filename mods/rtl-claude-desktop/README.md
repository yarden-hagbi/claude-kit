# rtl-claude-desktop

Claude Desktop lays out each line of a reply by its first strong letter, so a Hebrew line that opens with an English word (`PR חדש נפתח`) renders left-to-right and left-aligned. This mod hooks `ui.render` on `AssistantMessage` and puts a right-to-left mark (U+200F) at the start of every line that contains Hebrew, after any list, quote or heading marker, and before each Hebrew table cell. Code fences are left alone. Only the drawing changes; the stored message is untouched.
