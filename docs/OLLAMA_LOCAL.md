# Ollama + Zotero (local search)

This uses the existing Zotero Bridge plugin and a small CLI to query PDFs locally,
then sends the excerpts to Ollama.

## Requirements
- Zotero running with the Zotero Bridge plugin enabled.
- `ZOTERO_BRIDGE_TOKEN` set in your environment.
- Python with `pymupdf` installed (for `pdf-search`).
- Ollama running locally (`ollama serve` or the app open).

## Quick start
From the repo root, just type a question:

```
node tools/ollama_zotero_search.js
```

Or pass it directly:

```
node tools/ollama_zotero_search.js --ask "Vad sager PDFerna om mekanismer?"
```

Defaults:
- Bridge URL: `http://127.0.0.1:23119/bridge`
- Model: `llama3.2:latest`
- Library ID: `1`

## Options
```
--query "mechanis*"          Boolean search query for PDF search.
--ask "What does it say?"    Natural language question (query auto-derived).
--itemKey GUQF8UDX           Limit to one Zotero item.
--libraryID 1                Zotero library ID (default: 1).
--limit 20                   How many items to pull from Zotero search.
--maxResults 20              How many PDF hits to send to Ollama.
--model llama3.2:latest      Ollama model name.
--contextBefore 1            Sentences before a match.
--contextAfter 1             Sentences after a match.
```

## Example
```
node tools/ollama_zotero_search.js --query "mechanis*" --ask "Summarize the core idea"
```

## Environment variables
```
ZOTERO_BRIDGE_TOKEN=your-token
ZOTERO_BRIDGE_URL=http://127.0.0.1:23119/bridge
OLLAMA_URL=http://localhost:11434
PDF_SEARCH_PYTHON=python
PDF_SEARCH_CLI=C:\path\to\pdf-search\search_cli.py
```
