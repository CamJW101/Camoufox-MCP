#!/usr/bin/env node
// @ts-nocheck

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Camoufox, launchServer } from "camoufox-js";
import type { Browser, BrowserContext, Page, BrowserServer } from "playwright-core";

/**
 * Comprehensive Camoufox MCP Server
 * 
 * This server exposes ALL capabilities of Camoufox through MCP tools,
 * including advanced fingerprinting, browser automation, and privacy features.
 */

// Global state management for persistent sessions
interface BrowserSession {
  browser: Browser | BrowserContext;
  pages: Map<string, Page>;
  createdAt: Date;
}

interface ServerSession {
  server: BrowserServer;
  createdAt: Date;
}

const browserSessions = new Map<string, BrowserSession>();
const serverSessions = new Map<string, ServerSession>();

// Initialize MCP server
const server = new McpServer({
  name: "camoufox-mcp",
  version: "1.0.0",
});

/**
 * Tool: launch_browser
 * Launch a new Camoufox browser instance with FULL configuration
 * Exposes ALL Camoufox launch options
 */
// Launch a new Camoufox browser with comprehensive anti-detection and privacy features.
// Supports all Camoufox options including OS fingerprinting, blocking, humanization, locales, addons, fonts, 
// screen/window constraints, custom fingerprints, Firefox preferences, proxy, cache, arguments, environment variables, 
// debug mode, virtual display, and WebGL configuration.
// @ts-ignore
server.tool(
  "launch_browser",
  {
    session_id: z.string().optional().describe("Session ID for persistent browser instance. If not provided, a new session is created."),
    user_data_dir: z.string().optional().describe("User data directory for persistent profile."),
    os: z.union([z.enum(["windows", "macos", "linux"]), z.array(z.enum(["windows", "macos", "linux"]))]).optional().describe("Operating system to use for fingerprint generation. Can be a single OS or array to randomly choose from."),
    block_images: z.boolean().optional().describe("Block all images for faster loading and reduced bandwidth."),
    block_webrtc: z.boolean().optional().describe("Block WebRTC entirely for enhanced privacy."),
    block_webgl: z.boolean().optional().describe("Block WebGL to prevent fingerprinting (use for special cases only)."),
    disable_coop: z.boolean().optional().describe("Disable Cross-Origin-Opener-Policy to allow clicking elements in cross-origin iframes."),
    geoip: z.union([z.string(), z.boolean()]).optional().describe("Calculate location based on IP address. Pass target IP or true for auto-detection."),
    humanize: z.union([z.boolean(), z.number()]).optional().describe("Humanize cursor movement. Pass true or max duration in seconds (typically 1.5s to move across window)."),
    locale: z.union([z.string(), z.array(z.string())]).optional().describe("Locale(s) to use. First listed locale is used for Intl API."),
    addons: z.array(z.string()).optional().describe("List of Firefox addons to use (paths to .xpi files)."),
    fonts: z.array(z.string()).optional().describe("Additional fonts to load (font family names installed on system)."),
    custom_fonts_only: z.boolean().optional().describe("If enabled, OS-specific system fonts will not be passed to browser."),
    exclude_addons: z.array(z.string()).optional().describe("Default addons to exclude (e.g., ['UBO'] for uBlock Origin)."),
    screen: z.object({minWidth: z.number().optional(), maxWidth: z.number().optional(), minHeight: z.number().optional(), maxHeight: z.number().optional()}).optional().describe("Constraints for screen dimensions in generated fingerprint."),
    window: z.tuple([z.number(), z.number()]).optional().describe("Fixed window size [width, height] instead of random generation."),
    fingerprint: z.any().optional().describe("Custom BrowserForge fingerprint object. If not provided, random fingerprint is generated."),
    ff_version: z.number().optional().describe("Firefox version to use. Defaults to current Camoufox version. Use for special cases only."),
    headless: z.union([z.boolean(), z.literal("virtual")]).optional().describe("Run browser in headless mode. Can be true, false, or 'virtual' for virtual display."),
    main_world_eval: z.boolean().optional().describe("Enable running scripts in main world. Prepend 'mw:' to script in page.evaluate()."),
    executable_path: z.string().optional().describe("Custom browser executable path."),
    firefox_user_prefs: z.record(z.string(), z.any()).optional().describe("Firefox user preferences to set."),
    proxy: z.union([z.string(), z.object({server: z.string(), username: z.string().optional(), password: z.string().optional(), bypass: z.string().optional()})]).optional().describe("Proxy configuration. String format: 'http://proxy:port' or object with server, username, password."),
    enable_cache: z.boolean().optional().describe("Cache pages, requests, etc. (uses more memory)."),
    args: z.array(z.string()).optional().describe("Arguments to pass to the browser."),
    env: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Environment variables to set."),
    debug: z.boolean().optional().describe("Print the config being sent to Camoufox."),
    virtual_display: z.string().optional().describe("Virtual display number (e.g., ':99'). Handled by Camoufox."),
    webgl_config: z.tuple([z.string(), z.string()]).optional().describe("Specific WebGL vendor/renderer pair: [vendor, renderer]."),
  },
  async (params) => {
    try {
      const sessionId = params.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (browserSessions.has(sessionId)) {
        return {
          content: [{type: "text" as const, text: `Browser session '${sessionId}' already exists. Use a different session_id or close the existing session first.`}],
          isError: true
        };
      }

      console.error(`[Camoufox] Launching browser with session ID: ${sessionId}`);
      
      const { session_id, ...camoufoxOptions } = params;
      const browser = await Camoufox(camoufoxOptions as any);
      
      browserSessions.set(sessionId, {
        browser,
        pages: new Map(),
        createdAt: new Date()
      });

      console.error(`[Camoufox] Browser launched successfully with session: ${sessionId}`);
      
      return {
        content: [{type: "text" as const, text: JSON.stringify({success: true, session_id: sessionId, message: "Browser launched successfully", options_used: camoufoxOptions}, null, 2)}]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Camoufox] Error launching browser: ${errorMessage}`);
      return {content: [{type: "text" as const, text: `Failed to launch browser: ${errorMessage}`}], isError: true};
    }
  }
);

// Navigate to a URL in an existing browser session
// @ts-ignore
server.tool(
  "navigate",
  {
    session_id: z.string().describe("Browser session ID."),
    url: z.string().describe("URL to navigate to."),
    page_id: z.string().optional().describe("Page ID. If not provided, creates a new page."),
    wait_until: z.enum(["load", "domcontentloaded", "networkidle", "commit"]).optional().describe("When to consider navigation succeeded."),
    timeout: z.number().optional().describe("Navigation timeout in milliseconds."),
    referer: z.string().optional().describe("Referer header value."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found. Launch a browser first.`}], isError: true};
      }

      const pageId = params.page_id || `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let page = session.pages.get(pageId);
      if (!page) {
        page = await session.browser.newPage();
        session.pages.set(pageId, page);
      }

      await page.goto(params.url, {waitUntil: params.wait_until, timeout: params.timeout, referer: params.referer});

      const title = await page.title();
      const currentUrl = page.url();

      console.error(`[Camoufox] Navigated to: ${currentUrl}`);
      
      return {content: [{type: "text" as const, text: JSON.stringify({success: true, page_id: pageId, url: currentUrl, title: title}, null, 2)}]};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Camoufox] Navigation error: ${errorMessage}`);
      return {content: [{type: "text" as const, text: `Navigation failed: ${errorMessage}`}], isError: true};
    }
  }
);

// Get the HTML content from a page in a browser session
// @ts-ignore
server.tool(
  "get_content",
  {
    session_id: z.string().describe("Browser session ID."),
    page_id: z.string().describe("Page ID to get content from."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found.`}], isError: true};
      }

      const page = session.pages.get(params.page_id);
      if (!page) {
        return {content: [{type: "text" as const, text: `Page '${params.page_id}' not found in session.`}], isError: true};
      }

      const content = await page.content();
      const title = await page.title();
      const url = page.url();

      return {content: [{type: "text" as const, text: JSON.stringify({url, title, content}, null, 2)}]};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Failed to get content: ${errorMessage}`}], isError: true};
    }
  }
);

// Capture a screenshot of a page in a browser session
// @ts-ignore
server.tool(
  "screenshot",
  {
    session_id: z.string().describe("Browser session ID."),
    page_id: z.string().describe("Page ID to screenshot."),
    full_page: z.boolean().optional().describe("Capture full scrollable page."),
    type: z.enum(["png", "jpeg"]).optional().describe("Screenshot type."),
    quality: z.number().min(0).max(100).optional().describe("Quality for jpeg (0-100)."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found.`}], isError: true};
      }

      const page = session.pages.get(params.page_id);
      if (!page) {
        return {content: [{type: "text" as const, text: `Page '${params.page_id}' not found in session.`}], isError: true};
      }

      const screenshot = await page.screenshot({fullPage: params.full_page, type: params.type, quality: params.quality});

      return {
        content: [
          {type: "text" as const, text: `Screenshot captured for page ${params.page_id}`},
          {type: "image" as const, data: screenshot.toString('base64'), mimeType: `image/${params.type || 'png'}`}
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Failed to take screenshot: ${errorMessage}`}], isError: true};
    }
  }
);

// Execute JavaScript code in a page context
// @ts-ignore
server.tool(
  "evaluate",
  {
    session_id: z.string().describe("Browser session ID."),
    page_id: z.string().describe("Page ID to execute script in."),
    script: z.string().describe("JavaScript code to execute."),
    main_world: z.boolean().optional().describe("Execute in main world (requires main_world_eval enabled)."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found.`}], isError: true};
      }

      const page = session.pages.get(params.page_id);
      if (!page) {
        return {content: [{type: "text" as const, text: `Page '${params.page_id}' not found in session.`}], isError: true};
      }

      const scriptToEval = params.main_world ? `mw:${params.script}` : params.script;
      const result = await page.evaluate(scriptToEval);

      return {content: [{type: "text" as const, text: JSON.stringify({success: true, result}, null, 2)}]};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Script evaluation failed: ${errorMessage}`}], isError: true};
    }
  }
);

// Click an element on a page using a CSS selector
// @ts-ignore
server.tool(
  "click",
  {
    session_id: z.string().describe("Browser session ID."),
    page_id: z.string().describe("Page ID."),
    selector: z.string().describe("CSS selector of element to click."),
    button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button to use."),
    click_count: z.number().optional().describe("Number of times to click."),
    timeout: z.number().optional().describe("Timeout in milliseconds."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found.`}], isError: true};
      }

      const page = session.pages.get(params.page_id);
      if (!page) {
        return {content: [{type: "text" as const, text: `Page '${params.page_id}' not found in session.`}], isError: true};
      }

      await page.click(params.selector, {button: params.button, clickCount: params.click_count, timeout: params.timeout});

      return {content: [{type: "text" as const, text: `Clicked element: ${params.selector}`}]};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Click failed: ${errorMessage}`}], isError: true};
    }
  }
);

// Type text into an element on a page
// @ts-ignore
server.tool(
  "type_text",
  {
    session_id: z.string().describe("Browser session ID."),
    page_id: z.string().describe("Page ID."),
    selector: z.string().describe("CSS selector of element to type into."),
    text: z.string().describe("Text to type."),
    delay: z.number().optional().describe("Delay between key presses in milliseconds."),
    timeout: z.number().optional().describe("Timeout in milliseconds."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found.`}], isError: true};
      }

      const page = session.pages.get(params.page_id);
      if (!page) {
        return {content: [{type: "text" as const, text: `Page '${params.page_id}' not found in session.`}], isError: true};
      }

      await page.type(params.selector, params.text, {delay: params.delay, timeout: params.timeout});

      return {content: [{type: "text" as const, text: `Typed text into element: ${params.selector}`}]};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Type failed: ${errorMessage}`}], isError: true};
    }
  }
);

// Close a browser session and all its pages
// @ts-ignore
server.tool(
  "close_browser",
  {
    session_id: z.string().describe("Browser session ID to close."),
  },
  async (params) => {
    try {
      const session = browserSessions.get(params.session_id);
      if (!session) {
        return {content: [{type: "text" as const, text: `Browser session '${params.session_id}' not found.`}], isError: true};
      }

      await session.browser.close();
      browserSessions.delete(params.session_id);

      console.error(`[Camoufox] Browser session ${params.session_id} closed.`);
      
      return {content: [{type: "text" as const, text: `Browser session ${params.session_id} closed successfully.`}]};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Failed to close browser: ${errorMessage}`}], isError: true};
    }
  }
);

// List all active browser and server sessions
// @ts-ignore
server.tool(
  "list_sessions",
  async () => {
    try {
      const browsers = Array.from(browserSessions.entries()).map(([id, session]) => ({
        session_id: id,
        type: "browser",
        pages: Array.from(session.pages.keys()),
        created_at: session.createdAt.toISOString()
      }));

      const servers = Array.from(serverSessions.entries()).map(([id, session]) => ({
        server_id: id,
        type: "server",
        ws_endpoint: session.server.wsEndpoint(),
        created_at: session.createdAt.toISOString()
      }));

      return {
        content: [{type: "text" as const, text: JSON.stringify({browsers, servers, total_browsers: browsers.length, total_servers: servers.length}, null, 2)}]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {content: [{type: "text" as const, text: `Failed to list sessions: ${errorMessage}`}], isError: true};
    }
  }
);

/**
 * Main function to start the MCP server
 */
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Camoufox MCP] Server running on stdio...");
  } catch (error) {
    console.error("[Camoufox MCP] Fatal error during server initialization:", error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.error('\n[Camoufox MCP] Shutting down server...');
  
  for (const [id, session] of browserSessions.entries()) {
    try {
      await session.browser.close();
      console.error(`[Camoufox MCP] Closed browser session: ${id}`);
    } catch (error) {
      console.error(`[Camoufox MCP] Error closing browser ${id}:`, error);
    }
  }
  
  for (const [id, session] of serverSessions.entries()) {
    try {
      await session.server.close();
      console.error(`[Camoufox MCP] Closed server: ${id}`);
    } catch (error) {
      console.error(`[Camoufox MCP] Error closing server ${id}:`, error);
    }
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n[Camoufox MCP] Shutting down server...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('[Camoufox MCP] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Camoufox MCP] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

runServer().catch((error) => {
  console.error("[Camoufox MCP] Fatal error running server:", error);
  process.exit(1);
});
