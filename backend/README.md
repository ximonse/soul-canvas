# Soul Canvas Zotero Bridge

WebSocket bridge between Soul Canvas frontend and Zotero MCP server for seamless research library integration.

## Features

- ⚡ WebSocket-based real-time communication
- 🔍 Search Zotero library (metadata + full-text)
- 📝 Extract PDF annotations and highlights
- 🗂️ Browse collections and folders
- 💾 In-memory caching with TTL
- 🔄 Auto-reconnect on MCP server crash
- 🏥 Health check endpoint

## Architecture

```
Soul Canvas (Browser)
       ↓ WebSocket (ws://localhost:3001)
Zotero Bridge (Node.js)
       ↓ stdio
zotero-mcp Server
       ↓
Local Zotero Database + PDFs
```

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your ZOTERO_DATA_DIR
```

For Windows (default):
```
ZOTERO_DATA_DIR=C:\Users\YourName\Zotero\storage
```

### 3. Install Zotero MCP Server

```bash
npm install -g zotero-mcp
```

Or use npx (no install needed):
```bash
# Server will automatically use npx
```

### 4. Start Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## Endpoints

### HTTP Endpoints

- `GET /health` - Server health check
  ```json
  {
    "status": "ok",
    "timestamp": "2025-12-26T12:00:00.000Z",
    "mcp": { "connected": true, "reconnectAttempts": 0 },
    "cache": { "size": 5, "keys": [...] },
    "clients": 1
  }
  ```

- `GET /cache/stats` - Cache statistics
- `POST /cache/clear` - Clear cache

### WebSocket Messages

**Request format:**
```json
{
  "id": "uuid-v4",
  "type": "search",
  "params": { "query": "machine learning", "limit": 20 }
}
```

**Response format:**
```json
{
  "id": "uuid-v4",
  "type": "success",
  "data": { ... }
}
```

**Available message types:**
- `ping` - Test connection
- `search` - Search library (metadata)
- `fullTextSearch` - Search in PDF content
- `getAnnotations` - Get highlights/notes for item
- `getItemDetails` - Get full item metadata
- `getCollections` - List all collections/folders

## Troubleshooting

### Port already in use
Change `PORT` in `.env` to another port (e.g., 3002).

### MCP connection fails
- Ensure `zotero-mcp` is installed: `npm list -g zotero-mcp`
- Check Zotero data directory path in `.env`
- Verify Zotero database exists: `{ZOTERO_DATA_DIR}/../zotero.sqlite`

### WebSocket connection refused
- Check server is running: `curl http://localhost:3001/health`
- Verify firewall allows port 3001
- Check browser console for CORS errors

## Development

**Watch mode with auto-reload:**
```bash
npm run dev
```

**Type checking:**
```bash
npx tsc --noEmit
```

**Test WebSocket connection:**
```bash
npm install -g wscat
wscat -c ws://localhost:3001
```

Then send a test message:
```json
{"id":"test1","type":"ping","params":{}}
```

## License

Same as Soul Canvas (see root LICENSE)
