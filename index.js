import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "mdn",
  version: "0.0.1",
});

server.tool(
  "search",
  "Search MDN Web Docs and get summaries of relevant pages",
  {
    query: z.string().describe("Search query for MDN docs"),
  },
  async ({ query }) => {
    console.error(`[mdn-mcp] searching mdn for: ${query}`);

    const url = new URL(`https://developer.mozilla.org/api/v1/search`);
    url.searchParams.set("locale", "en-US");
    url.searchParams.set("q", query);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      /** @type {import("./search-types.js").SearchResponse} */
      const searchResponse = await res.json();
      return {
        content: [
          {
            type: "text",
            text: searchResponse.documents
              .map(
                (doc) => `Title: ${doc.title}
Path: \`${doc.mdn_url}\`
Summary:
${doc.summary}
`
              )
              .join("----------\n"),
          },
        ],
      };
    } catch (error) {
      console.error(`[mdn-mcp] error: ${error}`);
      return {
        content: [
          {
            type: "text",
            text: "Failed to search MDN documentation",
          },
        ],
      };
    }
  }
);

server.tool(
  "get-page",
  "Get full content of an MDN Web Docs page",
  {
    path: z
      .string()
      .describe("MDN page path (e.g., /en-US/docs/Web/API/Headers)"),
  },
  async ({ path }) => {
    console.error(`[mdn-mcp] getting page contents for: ${path}`);

    const url = new URL(path, `https://developer.mozilla.org/`);

    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      const html = await res.text();
      const match = html.match(/<main[^>]*>(.*?)<\/main>/s);
      return {
        content: [
          {
            type: "text",
            text: match?.[1] || html,
          },
        ],
      };
    } catch (error) {
      console.error(`[mdn-mcp] error: ${error}`);
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve MDN documentation",
          },
        ],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MDN MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
