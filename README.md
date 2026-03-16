# syncingsh

[한국어](README.kr.md)

Real-time collaborative notepad. Share a room code and anyone can edit the same document simultaneously. All data exists only in memory and vanishes when everyone leaves.

## Core Concepts

- **Ephemeral** — No data is stored on a server
- **Real-time sync** — Yjs CRDT + WebRTC P2P for conflict-free collaboration
- **No login required** — Anyone can join instantly

## Tech Stack

| Area | Technology |
|---|---|
| Framework | SvelteKit (Svelte 5) |
| Real-time sync | Yjs + WebRTC (P2P) |
| Editor | Tiptap (WYSIWYG block editor) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel |
| Testing | Vitest + Playwright |

## Features

### Rooms
- Short alphanumeric room codes (Google Classroom style)
- Join by entering a room code
- Data is destroyed when all participants leave

### Editor
- Notion-style WYSIWYG markdown editor
- Real-time co-editing via Yjs CRDT (conflict-free)

### Users
- No login — join instantly as a guest
- Nicknames auto-assigned as `Guest(random)` or user-defined, persisted in localStorage

### Presence
- Live display of connected users in the room

## Development

```bash
# Install dependencies
bun install

# Dev server
bun run dev

# Signaling server (for local P2P connections)
bun run signaling

# Tests
bun run test        # Unit tests
bun run test:e2e    # E2E tests

# Build
bun run build
```
