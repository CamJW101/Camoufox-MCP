# Camoufox-MCP 🦊

A comprehensive MCP (Model Context Protocol) server that exposes **ALL** capabilities of [Camoufox](https://camoufox.com/) - a privacy-focused Firefox fork with advanced anti-detection features.

This server provides complete access to Camoufox's browser automation capabilities including:
- 🛡️ **Advanced Anti-Detection**: OS fingerprinting, humanized cursor movements, and browser fingerprint spoofing
- 🌐 **Full Configuration**: All 25+ Camoufox launch options exposed
- 📦 **Session Management**: Persistent browser sessions with multiple pages
- 🔧 **Page Interaction**: Navigate, click, type, screenshot, and execute JavaScript
- 🚀 **High Performance**: Optimized for speed and minimal context usage

## Features

### Comprehensive Camoufox Support
- **OS Fingerprinting**: Spoof Windows, macOS, or Linux
- **Blocking Options**: Block images, WebRTC, WebGL for privacy and performance
- **Humanization**: Realistic cursor movements (configurable duration)
- **Locales & Fonts**: Custom locale settings and font loading
- **Addons**: Load Firefox addons (XPI files)
- **Screen/Window Constraints**: Control viewport and window dimensions
- **Custom Fingerprints**: Use BrowserForge fingerprints
- **Firefox Preferences**: Set custom Firefox user preferences
- **Proxy Support**: Full proxy configuration with authentication
- **Cache Control**: Enable/disable browser caching
- **Browser Arguments**: Pass custom command-line arguments
- **Environment Variables**: Set custom environment variables
- **Debug Mode**: Print Camoufox configuration
- **Virtual Display**: Support for virtual display (e.g., Xvfb)
- **WebGL Configuration**: Custom WebGL vendor/renderer pairs

### Session Management
- Create persistent browser sessions
- Manage multiple pages per session
- List all active sessions
- Clean shutdown handling

### Page Interaction
- Navigate to URLs with custom wait strategies
- Get HTML content from pages
- Capture screenshots (PNG/JPEG, full page or viewport)
- Execute JavaScript in page context
- Click elements by CSS selector
- Type text into elements
- Close individual pages or entire sessions

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the server
npm start
```

## Usage

### Launching the MCP Server

```bash
node dist/index.js
```

The server communicates via stdio, making it compatible with any MCP client.

### Available Tools

#### 1. `launch_browser`
Launch a new Camoufox browser with full configuration options.

**Parameters:**
- `session_id` (optional): Session ID for persistent browser
- `user_data_dir` (optional): User data directory for persistent profile
- `os` (optional): OS to spoof (`"windows"`, `"macos"`, `"linux"`, or array)
- `block_images` (optional): Block all images
- `block_webrtc` (optional): Block WebRTC
- `block_webgl` (optional): Block WebGL
- `disable_coop` (optional): Disable Cross-Origin-Opener-Policy
- `geoip` (optional): Auto-detect geolocation (string IP or `true`)
- `humanize` (optional): Humanize cursor movement (`true` or max seconds)
- `locale` (optional): Browser locale(s)
- `addons` (optional): Array of addon paths
- `fonts` (optional): Array of font family names
- `custom_fonts_only` (optional): Use only custom fonts
- `exclude_addons` (optional): Addons to exclude (e.g., `["UBO"]`)
- `screen` (optional): Screen dimension constraints
- `window` (optional): Fixed window size `[width, height]`
- `fingerprint` (optional): Custom BrowserForge fingerprint
- `ff_version` (optional): Firefox version number
- `headless` (optional): Headless mode (`true`, `false`, or `"virtual"`)
- `main_world_eval` (optional): Enable main world script execution
- `executable_path` (optional): Custom browser executable
- `firefox_user_prefs` (optional): Firefox preferences object
- `proxy` (optional): Proxy string or object with `server`, `username`, `password`
- `enable_cache` (optional): Enable browser caching
- `args` (optional): Browser command-line arguments
- `env` (optional): Environment variables object
- `debug` (optional): Print configuration
- `virtual_display` (optional): Virtual display number (e.g., `":99"`)
- `webgl_config` (optional): WebGL vendor/renderer pair `[vendor, renderer]`

**Returns:**
```json
{
  "success": true,
  "session_id": "session_1234...",
  "message": "Browser launched successfully",
  "options_used": { ... }
}
```

#### 2. `navigate`
Navigate to a URL in a browser session.

**Parameters:**
- `session_id`: Browser session ID
- `url`: URL to navigate to
- `page_id` (optional): Page ID (creates new page if not provided)
- `wait_until` (optional): `"load"`, `"domcontentloaded"`, `"networkidle"`, `"commit"`
- `timeout` (optional): Navigation timeout in milliseconds
- `referer` (optional): Referer header value

**Returns:**
```json
{
  "success": true,
  "page_id": "page_5678...",
  "url": "https://example.com",
  "title": "Example Domain"
}
```

#### 3. `get_content`
Get HTML content from a page.

**Parameters:**
- `session_id`: Browser session ID
- `page_id`: Page ID

**Returns:**
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "content": "<html>...</html>"
}
```

#### 4. `screenshot`
Capture a screenshot of a page.

**Parameters:**
- `session_id`: Browser session ID
- `page_id`: Page ID
- `full_page` (optional): Capture full scrollable page
- `type` (optional): `"png"` or `"jpeg"`
- `quality` (optional): JPEG quality (0-100)

**Returns:** Text message + base64-encoded image

#### 5. `evaluate`
Execute JavaScript in a page context.

**Parameters:**
- `session_id`: Browser session ID
- `page_id`: Page ID
- `script`: JavaScript code to execute
- `main_world` (optional): Execute in main world (requires `main_world_eval` enabled)

**Returns:**
```json
{
  "success": true,
  "result": ... // Script return value
}
```

#### 6. `click`
Click an element on a page.

**Parameters:**
- `session_id`: Browser session ID
- `page_id`: Page ID
- `selector`: CSS selector
- `button` (optional): `"left"`, `"right"`, `"middle"`
- `click_count` (optional): Number of clicks
- `timeout` (optional): Timeout in milliseconds

#### 7. `type_text`
Type text into an element.

**Parameters:**
- `session_id`: Browser session ID
- `page_id`: Page ID
- `selector`: CSS selector
- `text`: Text to type
- `delay` (optional): Delay between keystrokes in milliseconds
- `timeout` (optional): Timeout in milliseconds

#### 8. `close_browser`
Close a browser session and all its pages.

**Parameters:**
- `session_id`: Browser session ID to close

#### 9. `list_sessions`
List all active browser and server sessions.

**Returns:**
```json
{
  "browsers": [
    {
      "session_id": "session_1234...",
      "type": "browser",
      "pages": ["page_5678..."],
      "created_at": "2025-11-21T17:30:00.000Z"
    }
  ],
  "servers": [],
  "total_browsers": 1,
  "total_servers": 0
}
```

## Example Workflow

```javascript
// 1. Launch a browser with privacy features
{
  "tool": "launch_browser",
  "arguments": {
    "os": "windows",
    "block_webrtc": true,
    "humanize": true,
    "locale": "en-US",
    "headless": true
  }
}
// Returns: { "session_id": "session_abc123..." }

// 2. Navigate to a website
{
  "tool": "navigate",
  "arguments": {
    "session_id": "session_abc123...",
    "url": "https://example.com",
    "wait_until": "networkidle"
  }
}
// Returns: { "page_id": "page_xyz789..." }

// 3. Get page content
{
  "tool": "get_content",
  "arguments": {
    "session_id": "session_abc123...",
    "page_id": "page_xyz789..."
  }
}

// 4. Take a screenshot
{
  "tool": "screenshot",
  "arguments": {
    "session_id": "session_abc123...",
    "page_id": "page_xyz789...",
    "full_page": true
  }
}

// 5. Close the browser
{
  "tool": "close_browser",
  "arguments": {
    "session_id": "session_abc123..."
  }
}
```

## Configuration

The server runs on stdio and requires no additional configuration. All settings are passed as tool arguments.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev
```

## Requirements

- Node.js 20 or higher
- Camoufox browser (auto-downloaded by camoufox-js on first use)

## Architecture

- **TypeScript**: Type-safe implementation
- **MCP SDK**: Latest Model Context Protocol SDK
- **Camoufox-js**: Official JavaScript wrapper for Camoufox
- **Playwright**: Underlying browser automation (via Camoufox)

## License

MIT

## Acknowledgments

- [Camoufox](https://github.com/daijro/camoufox) - Privacy-focused Firefox fork
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [Anthropic](https://anthropic.com) - MCP standard creators
