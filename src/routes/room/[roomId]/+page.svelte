<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Y from 'yjs';
	import { WebrtcProvider } from 'y-webrtc';
	import Editor from '$lib/components/Editor.svelte';
	import Presence from '$lib/components/Presence.svelte';
	import { getNickname, setNickname, getUserColor } from '$lib/utils/nickname';
	import type { ConnectionStatus } from '$lib/types/yjs';
	import type { Awareness } from 'y-protocols/awareness';

	const roomId = $derived($page.params.roomId);

	let ydoc = $state<Y.Doc | null>(null);
	let awareness = $state<Awareness | null>(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let nickname = $state('');
	let editingName = $state(false);
	let reconnectAttempt = $state(0);
	let isReconnecting = $state(false);

	const MAX_RECONNECT_ATTEMPTS = 10;
	const BASE_RECONNECT_DELAY_MS = 1000;
	const MAX_RECONNECT_DELAY_MS = 30000;

	const statusColor = $derived(
		connectionStatus === 'connected'
			? '#22c55e'
			: connectionStatus === 'connecting'
				? '#eab308'
				: connectionStatus === 'error'
					? '#ef4444'
					: '#9ca3af'
	);

	const showReconnectBanner = $derived(
		isReconnecting || (connectionStatus === 'error' && reconnectAttempt >= MAX_RECONNECT_ATTEMPTS)
	);

	const reconnectBannerText = $derived(
		reconnectAttempt >= MAX_RECONNECT_ATTEMPTS
			? '연결에 실패했습니다. 페이지를 새로고침해 주세요.'
			: `재연결 중... (${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`
	);

	function updateNickname() {
		const trimmed = nickname.trim();
		if (!trimmed) return;
		setNickname(trimmed);
		if (awareness) {
			awareness.setLocalStateField('user', {
				name: trimmed,
				color: getUserColor()
			});
		}
		editingName = false;
	}

	function getReconnectDelay(attempt: number): number {
		const delay = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt), MAX_RECONNECT_DELAY_MS);
		// Add jitter (±25%) to prevent thundering herd
		const jitter = delay * 0.25 * (Math.random() * 2 - 1);
		return Math.round(delay + jitter);
	}

	onMount(() => {
		if (!roomId) return;

		const currentRoomId = roomId;
		nickname = getNickname();
		const userColor = getUserColor();
		const doc = new Y.Doc();

		const signalingUrls = import.meta.env.DEV
			? [`ws://${window.location.hostname}:4444`]
			: ['wss://signal.justn.me'];

		let provider: WebrtcProvider | null = null;
		let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
		let disconnectTimestamp: number | null = null;
		let destroyed = false;

		function clearReconnectTimer() {
			if (reconnectTimer !== null) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
		}

		function createProvider(iceServers?: RTCIceServer[]): WebrtcProvider {
			const webrtcProvider = new WebrtcProvider(currentRoomId, doc, {
				signaling: signalingUrls,
				...(iceServers && { peerOpts: { config: { iceServers } } }),
				maxConns: 20,
				filterBcConns: false
			});

			webrtcProvider.on('synced', () => {
				clearReconnectTimer();
				connectionStatus = 'connected';
				reconnectAttempt = 0;
				isReconnecting = false;
				disconnectTimestamp = null;
			});

			webrtcProvider.on('status', (event: { connected: boolean }) => {
				if (event.connected) {
					clearReconnectTimer();
					connectionStatus = 'connected';
					reconnectAttempt = 0;
					isReconnecting = false;
					disconnectTimestamp = null;
				} else {
					connectionStatus = 'connecting';
					if (!disconnectTimestamp) {
						disconnectTimestamp = Date.now();
					}
					scheduleReconnect();
				}
			});

			// Track real peer liveness: the status/synced events only reflect signaling
			// state, not actual WebRTC peer connectivity. Subscribe to the peers event
			// to detect when all peers drop (e.g. network interruption) and trigger
			// recovery. Guard against the initial empty-peer state before we ever had peers.
			let hadPeers = false;
			webrtcProvider.on('peers', (event: { webrtcPeers: string[]; bcPeers: string[] }) => {
				if (destroyed) return;
				const peerCount = event.webrtcPeers.length + event.bcPeers.length;
				if (peerCount > 0) {
					hadPeers = true;
				} else if (hadPeers) {
					// All previously-known peers have gone — treat as a potential disconnect
					hadPeers = false;
					if (connectionStatus === 'connected') {
						connectionStatus = 'connecting';
						if (!disconnectTimestamp) {
							disconnectTimestamp = Date.now();
						}
						scheduleReconnect();
					}
				}
			});

			// Set local user info for presence
			webrtcProvider.awareness.setLocalStateField('user', {
				name: nickname,
				color: userColor
			});

			return webrtcProvider;
		}

		function scheduleReconnect() {
			if (destroyed) return;
			if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
				connectionStatus = 'error';
				isReconnecting = false;
				return;
			}

			clearReconnectTimer();
			isReconnecting = true;

			const delay = getReconnectDelay(reconnectAttempt);
			reconnectTimer = setTimeout(() => {
				if (destroyed) return;
				attemptReconnect();
			}, delay);
		}

		function attemptReconnect() {
			if (destroyed) return;
			clearReconnectTimer();
			reconnectAttempt++;

			// Destroy old provider and create a new one
			if (provider) {
				try {
					provider.disconnect();
					provider.destroy();
				} catch {
					// Ignore errors during cleanup
				}
			}

			try {
				provider = createProvider();
				awareness = provider.awareness;
				connectionStatus = 'connecting';
			} catch {
				// If creation fails, schedule another attempt
				scheduleReconnect();
			}
		}

		function handleVisibilityChange() {
			if (destroyed) return;

			if (document.visibilityState === 'visible') {
				// Tab became visible — check if we need to reconnect
				if (connectionStatus !== 'connected' || (provider && !provider.connected)) {
					clearReconnectTimer();
					reconnectAttempt = 0;
					isReconnecting = true;
					attemptReconnect();
				} else if (provider && provider.connected) {
					// Force a re-sync by briefly disconnecting and reconnecting
					// This handles cases where the signaling server dropped us while hidden
					provider.disconnect();
					provider.connect();
				}
			}
		}

		function handleOnline() {
			if (destroyed) return;
			// Network came back — reset attempts and reconnect
			if (connectionStatus !== 'connected') {
				clearReconnectTimer();
				reconnectAttempt = 0;
				isReconnecting = true;
				attemptReconnect();
			}
		}

		const startProvider = (iceServers?: RTCIceServer[]) => {
			provider = createProvider(iceServers);
			ydoc = doc;
			awareness = provider.awareness;
			connectionStatus = 'connecting';
		};

		// Listen for tab visibility changes
		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Listen for network status changes
		window.addEventListener('online', handleOnline);

		const meteredApiKey = import.meta.env.VITE_METERED_API_KEY;
		if (meteredApiKey) {
			fetch(`https://syncingsh.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`)
				.then((res) => res.json())
				.then((servers: RTCIceServer[]) => startProvider(servers))
				.catch(() => startProvider());
		} else {
			startProvider();
		}

		return () => {
			destroyed = true;
			clearReconnectTimer();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('online', handleOnline);

			if (provider) {
				provider.disconnect();
				provider.destroy();
			}
			doc.destroy();
		};
	});
</script>

{#if showReconnectBanner}
	<div
		class="fixed top-0 right-0 left-0 z-50 flex items-center justify-center px-4 py-2 text-sm font-medium text-white"
		class:bg-yellow-500={reconnectAttempt < MAX_RECONNECT_ATTEMPTS}
		class:bg-red-500={reconnectAttempt >= MAX_RECONNECT_ATTEMPTS}
		role="alert"
	>
		{#if reconnectAttempt < MAX_RECONNECT_ATTEMPTS}
			<svg
				class="mr-2 h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		<span>{reconnectBannerText}</span>
		{#if reconnectAttempt >= MAX_RECONNECT_ATTEMPTS}
			<button
				onclick={() => window.location.reload()}
				class="ml-3 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30"
			>
				새로고침
			</button>
		{/if}
	</div>
{/if}

<div class="mx-auto max-w-4xl px-4 py-6" class:pt-14={showReconnectBanner}>
	<header class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-lg font-semibold text-gray-900">Room: {roomId}</h1>
			<div class="mt-1 flex items-center gap-2">
				{#if editingName}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							updateNickname();
						}}
						class="flex items-center gap-1"
					>
						<input
							type="text"
							bind:value={nickname}
							class="w-32 rounded border border-gray-300 px-2 py-0.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
						/>
						<button type="submit" class="text-sm text-gray-500 hover:text-gray-900">저장</button>
					</form>
				{:else}
					<button
						onclick={() => (editingName = true)}
						class="text-sm text-gray-500 hover:text-gray-900"
						title="닉네임 변경"
					>
						{nickname}
					</button>
				{/if}
				<span
					class="inline-block h-2.5 w-2.5 rounded-full"
					style="background-color: {statusColor}"
					title={connectionStatus}
				></span>
			</div>
		</div>
		<div class="flex items-center gap-3">
			{#if awareness}
				<Presence {awareness} />
			{/if}
		</div>
	</header>

	{#if ydoc}
		<Editor {ydoc} />
	{:else}
		<div class="flex h-64 items-center justify-center text-gray-400">연결 중...</div>
	{/if}
</div>
