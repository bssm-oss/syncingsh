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
| Signaling | Hono + WebSocket (Node.js) |
| Deployment | Vercel (frontend) + Render (signaling) |
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

## Architecture

```
Browser A ──┐                    ┌── Browser B
            │  WebRTC P2P (Yjs)  │
            └────────────────────┘
                     │
              signaling only
                     │
            ┌────────────────┐
            │ Signaling Server│  ← Hono + WebSocket
            │  (Render.com)  │     y-webrtc protocol
            └────────────────┘
```

The signaling server only brokers initial WebRTC connections. All document data flows directly between browsers via P2P.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Install signaling server dependencies
cd signaling && npm install && cd ..
```

### Running locally

You need **two terminals** — the signaling server and the SvelteKit dev server:

```bash
# Terminal 1: Signaling server (ws://localhost:4444)
npm run signaling

# Terminal 2: SvelteKit dev server (http://localhost:5173)
npm run dev
```

Open http://localhost:5173, create a room, and open the same URL in another tab to test real-time sync.

### Tests

```bash
npm test            # Unit tests (Vitest)
npm run test:e2e    # E2E tests (Playwright)
```

### Build

```bash
npm run build       # SvelteKit production build
```

## Deployment

| Service | Platform | Config |
|---|---|---|
| Frontend (SvelteKit) | Vercel | Auto-deployed on push |
| Signaling (Hono) | Render | `render.yaml` |

See [`signaling/README.md`](signaling/README.md) for signaling server details.
