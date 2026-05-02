import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import type { WSContext } from 'hono/ws';

const MAX_MESSAGE_BYTES = Number(process.env.WS_MAX_MESSAGE_BYTES) || 16 * 1024;
const MAX_TOPICS_PER_MESSAGE = Number(process.env.WS_MAX_TOPICS_PER_MESSAGE) || 32;
const MAX_TOPICS_PER_CONNECTION = Number(process.env.WS_MAX_TOPICS_PER_CONNECTION) || 128;
const MAX_TOPIC_LENGTH = Number(process.env.WS_MAX_TOPIC_LENGTH) || 128;
const MAX_PUBLISH_RECEIVERS = Number(process.env.WS_MAX_PUBLISH_RECEIVERS) || 128;
const RATE_LIMIT_WINDOW_MS = Number(process.env.WS_RATE_LIMIT_WINDOW_MS) || 10_000;
const RATE_LIMIT_MAX_MESSAGES = Number(process.env.WS_RATE_LIMIT_MAX_MESSAGES) || 120;
const ALLOWED_ORIGINS = new Set(
	(process.env.WS_ORIGIN_ALLOWLIST ?? '')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean)
);

// y-webrtc signaling protocol message types
type SignalingMessage =
	| { type: 'subscribe'; topics: string[] }
	| { type: 'unsubscribe'; topics: string[] }
	| { type: 'publish'; topic: string; [key: string]: unknown }
	| { type: 'ping' };

interface ConnState {
	ws?: WSContext;
	subscribedTopics: Set<string>;
	messageTimestamps: number[];
	alive: boolean;
	acceptedOrigin: boolean;
}

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const topics = new Map<string, Set<ConnState>>();

function send(conn: ConnState, data: unknown) {
	try {
		conn.ws?.send(JSON.stringify(data));
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

function closePolicyViolation(conn: ConnState, reason: string) {
	try {
		conn.ws?.close(1008, reason);
	} catch {
		// connection already closed
	} finally {
		cleanup(conn);
	}
}

function isOriginAllowed(origin: string | undefined) {
	return ALLOWED_ORIGINS.size === 0 || (!!origin && ALLOWED_ORIGINS.has(origin));
}

function isValidTopic(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= MAX_TOPIC_LENGTH &&
		!/\p{C}/u.test(value)
	);
}

function limitedTopics(value: unknown): string[] | null {
	if (!Array.isArray(value) || value.length > MAX_TOPICS_PER_MESSAGE) return null;
	const valid = value.filter(isValidTopic);
	return valid.length === value.length ? valid : null;
}

function isRateLimited(conn: ConnState) {
	const now = Date.now();
	const windowStart = now - RATE_LIMIT_WINDOW_MS;
	conn.messageTimestamps = conn.messageTimestamps.filter((timestamp) => timestamp >= windowStart);
	conn.messageTimestamps.push(now);
	return conn.messageTimestamps.length > RATE_LIMIT_MAX_MESSAGES;
}

function parseMessage(raw: string): SignalingMessage | null {
	const parsed = JSON.parse(raw) as unknown;
	if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) return null;
	const message = parsed as { type: unknown; topics?: unknown; topic?: unknown };

	if (message.type === 'ping') return { type: 'ping' };
	if (message.type === 'subscribe') {
		const parsedTopics = limitedTopics(message.topics);
		return parsedTopics ? { type: 'subscribe', topics: parsedTopics } : null;
	}
	if (message.type === 'unsubscribe') {
		const parsedTopics = limitedTopics(message.topics);
		return parsedTopics ? { type: 'unsubscribe', topics: parsedTopics } : null;
	}
	if (message.type === 'publish' && isValidTopic(message.topic)) {
		return parsed as SignalingMessage;
	}

	return null;
}

function handle(conn: ConnState, msg: SignalingMessage) {
	switch (msg.type) {
		case 'subscribe':
			if (conn.subscribedTopics.size + msg.topics.length > MAX_TOPICS_PER_CONNECTION) {
				closePolicyViolation(conn, 'too many topics');
				return;
			}

			for (const t of msg.topics) {
				if (!topics.has(t)) topics.set(t, new Set());
				topics.get(t)!.add(conn);
				conn.subscribedTopics.add(t);
			}
			break;

		case 'unsubscribe':
			for (const t of msg.topics) {
				topics.get(t)?.delete(conn);
				conn.subscribedTopics.delete(t);
			}
			break;

		case 'publish': {
			const receivers = topics.get(msg.topic);
			if (receivers && receivers.size <= MAX_PUBLISH_RECEIVERS) {
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
	return upgradeWebSocket((c) => {
		const acceptedOrigin = isOriginAllowed(c.req.header('origin'));
		const conn: ConnState = {
			subscribedTopics: new Set(),
			messageTimestamps: [],
			alive: true,
			acceptedOrigin
		};

		return {
			onOpen(_ev, ws) {
				conn.ws = ws;
				if (!conn.acceptedOrigin) closePolicyViolation(conn, 'origin not allowed');
			},
			onMessage(ev) {
				if (!conn.acceptedOrigin) return;
				conn.alive = true;
				if (isRateLimited(conn)) {
					closePolicyViolation(conn, 'rate limit exceeded');
					return;
				}
				const raw = typeof ev.data === 'string' ? ev.data : ev.data.toString();
				if (raw.length > MAX_MESSAGE_BYTES) {
					closePolicyViolation(conn, 'message too large');
					return;
				}

				try {
					const msg = parseMessage(raw);
					if (msg) handle(conn, msg);
				} catch {
					// ignore malformed JSON
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
					conn.ws?.close();
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
