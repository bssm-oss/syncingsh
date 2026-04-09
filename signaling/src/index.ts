import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import type { WSContext } from 'hono/ws';

// y-webrtc signaling protocol message types
type SignalingMessage =
	| { type: 'subscribe'; topics: string[] }
	| { type: 'unsubscribe'; topics: string[] }
	| { type: 'publish'; topic: string; [key: string]: unknown }
	| { type: 'ping' };

interface ConnState {
	ws: WSContext;
	subscribedTopics: Set<string>;
	alive: boolean;
}

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const topics = new Map<string, Set<ConnState>>();

function send(conn: ConnState, data: unknown) {
	try {
		conn.ws.send(JSON.stringify(data));
	} catch {
		// connection already closed
	}
}

function cleanup(conn: ConnState) {
	for (const topic of conn.subscribedTopics) {
		const subs = topics.get(topic);
		if (subs) {
			subs.delete(conn);
			if (subs.size === 0) topics.delete(topic);
		}
	}
	conn.subscribedTopics.clear();
}

function handle(conn: ConnState, msg: SignalingMessage) {
	switch (msg.type) {
		case 'subscribe':
			for (const t of msg.topics ?? []) {
				if (typeof t !== 'string') continue;
				if (!topics.has(t)) topics.set(t, new Set());
				topics.get(t)!.add(conn);
				conn.subscribedTopics.add(t);
			}
			break;

		case 'unsubscribe':
			for (const t of msg.topics ?? []) {
				topics.get(t)?.delete(conn);
			}
			break;

		case 'publish': {
			const receivers = topics.get(msg.topic);
			if (receivers) {
				const out = { ...msg, clients: receivers.size };
				for (const r of receivers) send(r, out);
			}
			break;
		}

		case 'ping':
			send(conn, { type: 'pong' });
			break;
	}
}

function createWsHandler() {
	return upgradeWebSocket(() => {
		const conn: ConnState = { ws: null!, subscribedTopics: new Set(), alive: true };

		return {
			onOpen(_ev, ws) {
				conn.ws = ws;
			},
			onMessage(ev) {
				conn.alive = true;
				try {
					const raw = typeof ev.data === 'string' ? ev.data : ev.data.toString();
					const msg: SignalingMessage = JSON.parse(raw);
					if (msg?.type) handle(conn, msg);
				} catch {
					// ignore malformed
				}
			},
			onClose() {
				cleanup(conn);
			},
			onError() {
				cleanup(conn);
			}
		};
	});
}

// Health check
app.get('/health', (c) => c.text('ok'));

// y-webrtc connects to the root path
app.get('/', createWsHandler());

const port = Number(process.env.PORT) || 4444;

const server = serve({ fetch: app.fetch, port }, (info) => {
	console.log(`Signaling server running on port ${info.port}`);
});

injectWebSocket(server);

// Keepalive: evict dead connections every 30s
setInterval(() => {
	for (const [, subs] of topics) {
		for (const conn of subs) {
			if (!conn.alive) {
				try {
					conn.ws.close();
				} catch {
					// ignore
				}
				cleanup(conn);
				continue;
			}
			conn.alive = false;
		}
	}
}, 30_000);
