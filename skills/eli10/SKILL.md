---
name: eli10
description: Explain a topic, link, file or piece of code as a visual page for a smart 10-year-old - plain words, real examples, and how it actually works. Use when the user runs /hagbi:eli10.
argument-hint: "[topic, link, file or code]"
disable-model-invocation: true
---

# eli10

Explain the topic below as a visual page. The reader is smart and curious but new to this subject. Think of a sharp 10-year-old, or an adult from another field: they understand everyday ideas and can follow real reasoning, they just don't know this area's words yet.

Topic: $ARGUMENTS

## What to explain

- If a topic is given, explain it.
- If it names a file, a folder or code, read it first, then explain what it does and how it works, with examples taken from the code itself.
- If it is a link, read the page first, then explain what it describes, using its own examples and numbers. Paraphrase instead of copying its text.
- If no topic is given, explain what this conversation was just about. If there is nothing to go on, ask what to explain and stop.

## How to explain

- **Talk to the reader as smart.** No baby talk, no "super cool!", no cartoon cuteness, no talking down.
- **Concrete over abstract.** Use real things: an actual app, a real number, an everyday situation. A comparison is fine when it helps, but say where it stops being true, and never let it replace the real thing.
- **Show the mechanism.** Say how it works, step by step, in the order it happens, and not only what it is "like".
- **Use the real words.** Name the actual terms, and explain each one in plain language the first time it appears. The reader should leave able to understand someone who uses them.
- **Start with why it exists**, the problem it solves, before the how.
- **Length fits the topic.** A small idea gets a short page. A big one gets more sections. No filler, and nothing repeated.

## The page

- One self-contained HTML page. The visuals carry the explanation: diagrams, step-by-step flows, labelled pictures, before/after comparisons. Draw them with inline SVG or HTML/CSS, not external images.
- Short text next to each visual, in plain sentences. Not a wall of text.
- A useful order: why it exists, then the main parts, then how it works step by step, then a real example from start to finish, then one or two common misconceptions or "what if" cases.
- Write in the language of the user's request. For Hebrew or another right-to-left language, set the page to right-to-left.
- Publish it as a private artifact when an artifact tool is available, following that tool's design guidance. Otherwise, write it to an HTML file and show it to the user.
- After the page, reply with one line saying what it covers and where to find it.
