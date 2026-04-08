# @synexiom-labs/nodiom-mcp

**MCP server for [nodiom](https://github.com/Synexiom-Labs/nodiom) — structured read/write access to Markdown documents for AI agents.**

[![npm version](https://img.shields.io/npm/v/@synexiom-labs%2Fnodiom-mcp)](https://www.npmjs.com/package/@synexiom-labs/nodiom-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

Expose nodiom's structural Markdown operations as [Model Context Protocol](https://modelcontextprotocol.io) tools. Any MCP-compatible agent — Claude Desktop, Claude Code, or any custom MCP client — can read, write, append, and delete content in Markdown files using structural selectors, without regex or string hacking.

---

## Install

```bash
npm install -g @synexiom-labs/nodiom-mcp
```

Or use directly with `npx` (no install required):

```bash
npx @synexiom-labs/nodiom-mcp
```

---

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "nodiom": {
      "command": "npx",
      "args": ["-y", "@synexiom-labs/nodiom-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add -s user nodiom -- npx -y @synexiom-labs/nodiom-mcp
```

The `-s user` flag registers the server globally across all your projects. Without it, the server is only active when Claude Code's working directory matches the project where you ran the command.

### Any MCP client (stdio transport)

```json
{
  "command": "npx",
  "args": ["-y", "@synexiom-labs/nodiom-mcp"]
}
```

---

## Tools

The server exposes 7 tools, all operating on local Markdown files by absolute path.

### `nodiom_tree`
Get the structural outline of a document before reading or modifying it.

```
file: "/path/to/wiki.md"
→ Returns a nested JSON tree of all headings
```

### `nodiom_read`
Read the content at a structural location.

```
file: "/path/to/wiki.md"
selector: "# Project Aurora > ## Tasks > ### Active"
→ Returns the Markdown content of that section
```

### `nodiom_read_list`
Read all list items under a section as a JSON array.

```
file: "/path/to/wiki.md"
selector: "# Project Aurora > ## Team"
→ ["- Alice Chen — Tech Lead", "- Bob Martinez — ML Engineer", ...]
```

### `nodiom_write`
Replace the content of a section (heading is preserved).

```
file: "/path/to/wiki.md"
selector: "# Project Aurora > ## Overview"
content: "Project Aurora is on track for Q3 delivery."
→ Replaces only the Overview body. Nothing else changes.
```

### `nodiom_append`
Append content after the last item in a section.

```
file: "/path/to/wiki.md"
selector: "# Project Aurora > ## Tasks > ### Active"
content: "- [ ] Deploy to staging"
→ Adds the new task at the end of Active. Existing tasks untouched.
```

### `nodiom_delete`
Remove a node or section.

```
file: "/path/to/wiki.md"
selector: "# Project Aurora > ## Tasks > ### Completed > li[0]"
→ Removes the first completed task.
```

### `nodiom_query`
Check if a section exists and get its metadata.

```
file: "/path/to/wiki.md"
selector: "# Project Aurora > ## Tasks"
→ { "exists": true, "type": "heading", "depth": 2, "childCount": 3, "index": 4 }
```

---

## Selector Syntax

Selectors are `" > "`-separated paths of heading and element segments:

```
"# Project"                          → H1 section
"# Project > ## Tasks"               → H2 under H1
"# Project > ## Tasks > ### Active"  → H3 under H2 under H1
"## Tasks > li[0]"                   → First list item
"## Tasks > li[-1]"                  → Last list item
"## Notes > p[0]"                    → First paragraph
"## Arch > table[0]"                 → First table
```

When a selector doesn't match, the error includes fuzzy suggestions: `"Did you mean '## Tasks'?"`

---

## Example Agent Prompt

Once the server is configured, you can instruct Claude naturally:

> "Look at my project wiki at `/Users/me/projects/aurora/wiki.md`. What are the active tasks? Add a new task: 'Write integration tests'. Then move the first completed task to a new '## Archive' section."

Claude will use `nodiom_tree` to understand the structure, `nodiom_read_list` to get the tasks, `nodiom_append` to add the new one, and `nodiom_read` + `nodiom_delete` + `nodiom_append` to move the completed task — all without loading the entire file as a string.

---

## Part of the Nodiom ecosystem

| Package | Description |
|---|---|
| [`@synexiom-labs/nodiom`](https://github.com/Synexiom-Labs/nodiom) | Core library — use directly in your Node.js code |
| `@synexiom-labs/nodiom-mcp` | This package — MCP server for AI agents |

---

## License

MIT — [Synexiom Labs Inc.](https://synexiomlabs.com)
