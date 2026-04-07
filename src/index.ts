#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Nodiom, SelectorNotFoundError, SelectorParseError } from '@synexiom-labs/nodiom';
import { z } from 'zod';

const server = new McpServer({
  name: 'nodiom-mcp',
  version: '0.1.0',
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Wraps an operation and returns a well-formed MCP error response on failure. */
function errorResponse(e: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const message =
    e instanceof SelectorNotFoundError
      ? e.message
      : e instanceof SelectorParseError
        ? e.message
        : e instanceof Error
          ? e.message
          : String(e);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

function okResponse(text: string): { content: Array<{ type: 'text'; text: string }> } {
  return { content: [{ type: 'text', text }] };
}

// ---------------------------------------------------------------------------
// Tool: nodiom_read
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_read',
  {
    title: 'Read Markdown section',
    description:
      'Returns the Markdown content at a structural location in a file. ' +
      'Use a selector like "# Heading > ## Subheading" to address any section. ' +
      'Use "# H1 > ## H2 > li[0]" to read a specific list item. ' +
      'Returns the raw Markdown string of the matched content.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
      selector: z
        .string()
        .describe(
          'Structural selector. Examples: "# Project > ## Tasks", "## Notes > p[0]", "## Tasks > li[-1]"',
        ),
    }),
  },
  async ({ file, selector }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      return okResponse(doc.read(selector));
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: nodiom_read_list
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_read_list',
  {
    title: 'Read list items',
    description:
      'Returns all list items under a selector as a JSON array of strings. ' +
      'Useful when you need to iterate over tasks, team members, or any bullet list.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
      selector: z
        .string()
        .describe('Selector pointing to a section containing a list. Example: "## Tasks > ### Active"'),
    }),
  },
  async ({ file, selector }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      const items = doc.readList(selector);
      return okResponse(JSON.stringify(items, null, 2));
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: nodiom_write
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_write',
  {
    title: 'Write (replace) Markdown section',
    description:
      'Replaces the content at a structural location with new content. ' +
      'The heading itself is preserved — only the body content is replaced. ' +
      'All other sections in the document are untouched.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
      selector: z.string().describe('Selector for the section to replace. Example: "## Summary"'),
      content: z.string().describe('New Markdown content to place at this location.'),
    }),
  },
  async ({ file, selector, content }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      doc.write(selector, content);
      await doc.save();
      return okResponse(`Written to '${selector}' in ${file}`);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: nodiom_append
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_append',
  {
    title: 'Append content to Markdown section',
    description:
      'Appends new content after the last item in a section. ' +
      'Use this to add a new task, log entry, or note without disturbing existing content. ' +
      'Content is added at the end of the matched section.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
      selector: z.string().describe('Selector for the section to append to. Example: "## Tasks > ### Active"'),
      content: z.string().describe('Markdown content to append. Example: "- [ ] New task"'),
    }),
  },
  async ({ file, selector, content }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      doc.append(selector, content);
      await doc.save();
      return okResponse(`Appended to '${selector}' in ${file}`);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: nodiom_delete
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_delete',
  {
    title: 'Delete Markdown node',
    description:
      'Removes the node or section matched by the selector. ' +
      'Use "## Section > li[0]" to delete the first list item. ' +
      'Use "## Section" to delete an entire section including its heading. ' +
      'All other content is untouched.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
      selector: z
        .string()
        .describe(
          'Selector for the node to delete. Example: "## Completed > li[0]", "## Old Section"',
        ),
    }),
  },
  async ({ file, selector }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      doc.delete(selector);
      await doc.save();
      return okResponse(`Deleted '${selector}' from ${file}`);
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: nodiom_query
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_query',
  {
    title: 'Query node metadata',
    description:
      'Returns structural metadata about a location: whether it exists, its type, depth, ' +
      'and child count. Use this to check if a section exists before reading or writing to it.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
      selector: z.string().describe('Selector to query. Example: "## Tasks > ### Active"'),
    }),
  },
  async ({ file, selector }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      const result = doc.query(selector);
      return okResponse(JSON.stringify(result, null, 2));
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: nodiom_tree
// ---------------------------------------------------------------------------

server.registerTool(
  'nodiom_tree',
  {
    title: 'Get document outline',
    description:
      'Returns the full structural outline of a Markdown document as a nested JSON tree of headings. ' +
      'Use this to understand the structure of a document before reading or modifying it.',
    inputSchema: z.object({
      file: z.string().describe('Absolute path to the Markdown file.'),
    }),
  },
  async ({ file }) => {
    try {
      const doc = await Nodiom.fromFile(file);
      const outline = doc.tree();
      return okResponse(JSON.stringify(outline, null, 2));
    } catch (e) {
      return errorResponse(e);
    }
  },
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);