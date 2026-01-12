<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Y from 'yjs';
	import { WebrtcProvider } from 'y-webrtc';
	import type { ConnectionStatus } from '$lib/types/yjs';

	const roomId = $derived($page.params.roomId);

	let ydoc = $state<Y.Doc | null>(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let peerCount = $state<number>(0);
	let errorMessage = $state<string | null>(null);

	const connectionColor = $derived(
		connectionStatus === 'connected'
			? 'green'
			: connectionStatus === 'connecting'
				? 'yellow'
				: connectionStatus === 'error'
					? 'red'
					: 'gray'
	);

	const connectionText = $derived(
		connectionStatus === 'connected'
			? `Connected (${peerCount} peers)`
			: connectionStatus === 'connecting'
				? 'Connecting...'
				: connectionStatus === 'error'
					? 'Connection Failed'
					: 'Disconnected'
	);

	onMount(() => {
		// Guard against undefined roomId
		if (!roomId) {
			errorMessage = 'Room ID is missing';
			connectionStatus = 'error';
			return;
		}

		// 1. Create Y.Doc instance
		const doc = new Y.Doc();

		// 2. Initialize WebrtcProvider with roomId
		const signalingUrl = import.meta.env.DEV
			? 'ws://localhost:4444'
			: 'wss://signaling.yjs.dev';

		const webrtcProvider = new WebrtcProvider(roomId, doc, {
			signaling: [signalingUrl],
			maxConns: 20,
			filterBcConns: false // Allow BroadcastChannel for same-browser tabs
		});

		// 3. Set up event listeners
		webrtcProvider.on('synced', () => {
			connectionStatus = 'connected';
			console.log('[Yjs] Synced with peers');
		});

		webrtcProvider.on('status', (event: { connected: boolean }) => {
			connectionStatus = event.connected ? 'connected' : 'connecting';
			console.log('[Yjs] Connection status:', event.connected);
		});

		// 4. Update state
		ydoc = doc;
		connectionStatus = 'connecting';

		console.log('[Yjs] Initialized for room:', roomId);

		// Track awareness changes (user presence)
		const awareness = webrtcProvider.awareness;

		const updatePeerCount = () => {
			const states = awareness.getStates();
			const clientCount = states.size;
			const stateArray = Array.from(states.keys());
			peerCount = Math.max(0, clientCount - 1); // Exclude self
			console.log('[Yjs] Awareness changed - Total clients:', clientCount, 'Peers:', peerCount, 'Client IDs:', stateArray);
		};

		awareness.on('change', updatePeerCount);

		// Initial count
		updatePeerCount();

		// 5. Cleanup function
		return () => {
			console.log('[Yjs] Cleaning up...');
			awareness.off('change', updatePeerCount);
			webrtcProvider.disconnect();
			webrtcProvider.destroy();
			doc.destroy();
		};
	});
</script>

<div class="room-container">
	<!-- Status Bar -->
	<div class="status-bar">
		<div class="status-content">
			<span class="status-indicator" style="background-color: {connectionColor};"></span>
			<span class="status-text">{connectionText}</span>
		</div>
		{#if errorMessage}
			<div class="error-message">{errorMessage}</div>
		{/if}
	</div>

	<!-- Room Header -->
	<div class="room-header">
		<h1 class="room-title">Room: {roomId}</h1>
		<p class="room-subtitle">Share this URL to invite collaborators</p>
		{#if connectionStatus === 'connected' && peerCount > 0}
			<p class="peer-info">
				{peerCount} peer{peerCount !== 1 ? 's' : ''} connected
			</p>
		{/if}
	</div>

	<!-- Debug Panel (Development Only) -->
	{#if import.meta.env.DEV}
		<div class="debug-panel">
			<h3 class="debug-title">Debug Info</h3>
			<pre class="debug-content">Status: {connectionStatus}
Peers: {peerCount}
Room ID: {roomId}
Doc GUID: {ydoc?.guid || 'Not initialized'}</pre>
		</div>
	{/if}
</div>

<style>
	.status-bar {
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.status-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-indicator {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.status-text {
		font-weight: 500;
	}

	.error-message {
		color: red;
		margin-top: 0.5rem;
	}

	.room-header {
		margin-bottom: 2rem;
	}

	.room-title {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.room-subtitle {
		color: #666;
	}

	.peer-info {
		color: green;
		margin-top: 0.5rem;
	}

	.debug-panel {
		padding: 1rem;
		background: #f0f0f0;
		border-radius: 8px;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.debug-title {
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.debug-content {
		margin: 0;
	}
</style>
