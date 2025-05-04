import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Authless Calculator",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "add",
      { a: z.number(), b: z.number() },
      async ({ a, b }) => ({
        content: [{ type: "text", text: String(a + b) }],
      })
    );

    this.server.tool(
      "calculate",
      {
        operation: z.enum(["add", "subtract", "multiply", "divide"]),
        a: z.number(),
        b: z.number(),
      },
      async ({ operation, a, b }) => {
        let result: number;
        switch (operation) {
          case "add":
            result = a + b;
            break;
          case "subtract":
            result = a - b;
            break;
          case "multiply":
            result = a * b;
            break;
          case "divide":
            if (b === 0)
              return {
                content: [
                  {
                    type: "text",
                    text: "Error: Cannot divide by zero",
                  },
                ],
              };
            result = a / b;
            break;
        }
        return { content: [{ type: "text", text: String(result) }] };
      }
    );
  }
}

let handler: ExportedHandler;

const setup = async (): Promise<ExportedHandler> => {
  const agent = new MyMCP();
  await agent.init();

  return {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
      const url = new URL(request.url);

      if (url.pathname === "/sse" || url.pathname === "/sse/message") {
        return agent.server.serveSSE().fetch(request, env, ctx);
      }

      if (url.pathname === "/mcp") {
        return agent.server.serve().fetch(request, env, ctx);
      }

      return new Response("Not found", { status: 404 });
    },
  };
};

// Create and export handler
handler = await setup();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};
