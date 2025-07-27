import { createMcpHandler } from "mcp-handler";
import { readFileSync } from "fs";
import { join } from "path";

async function checkUserRole(mcpToken: string | undefined): Promise<string> {
  if (!mcpToken) {
    return 'public';
  }

  try {
    // Call the elephantAi API to determine user role using MCP token
    const response = await fetch(`${process.env.SECRET_ELEPHANT_AI_URL}/api/auth/role`, {
      headers: {
        'Cookie': `mcp_auth=${mcpToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.role || 'public';
    }
  } catch (error: unknown) {
    console.error('Error checking user role:', error);
  }
  
  return 'public';
}

// Store request context for access in tools
let currentRequest: Request | null = null;

const handler = createMcpHandler((server) => {
  server.tool("getSecretElephant", {}, async () => {
    try {
      // Extract MCP token from Authorization header
      const authHeader = currentRequest?.headers?.get('authorization');
      const mcpToken = authHeader?.replace('Bearer ', '');
      
      const userRole = await checkUserRole(mcpToken);
      const hasSecretElephantAccess = userRole === 'admin';
      
      const filePath = join(process.cwd(), hasSecretElephantAccess ? "secretElephant.md" : "publicElephant.md");
      const content = readFileSync(filePath, "utf-8");
      return {
        content: [{ type: "text", text: content }],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: "text", text: `Error reading elephant data: ${errorMessage}` }],
      };
    }
  });
});

// Wrapper to capture request context
const wrappedHandler = async (request: Request) => {
  currentRequest = request;
  return handler(request);
};

export { wrappedHandler as GET, wrappedHandler as POST, wrappedHandler as DELETE };
