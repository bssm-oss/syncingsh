<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Y from 'yjs';
	import { WebrtcProvider } from 'y-webrtc';
	import type { ConnectionStatus } from '$lib/types/yjs';

	const roomId = $derived($page.params.roomId);

	let ydoc = $state<Y.Doc | null>(null);
	let provider = $state<WebrtcProvider | null>(null);
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
		const webrtcProvider = new WebrtcProvider(roomId, doc, {
			signaling: [
				'wss://signaling.yjs.dev',
				'wss://y-webrtc-signaling-eu.herokuapp.com',
				'wss://y-webrtc-signaling-us.herokuapp.com'
			],
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

		webrtcProvider.on('peers', (event: { webrtcPeers: any[]; bcConns?: Set<any> }) => {
			const webrtcCount = event.webrtcPeers.length;
			const bcCount = event.bcConns ? event.bcConns.size : 0;
			peerCount = webrtcCount + bcCount;
			console.log('[Yjs] Peers connected:', peerCount, '(WebRTC:', webrtcCount, 'BroadcastChannel:', bcCount + ')');
		});

		// 4. Update state
		ydoc = doc;
		provider = webrtcProvider;
		connectionStatus = 'connecting';

		console.log('[Yjs] Initialized for room:', roomId);
		console.log('[Yjs] Doc GUID:', doc.guid);
		console.log('[Yjs] BroadcastChannel supported:', typeof BroadcastChannel !== 'undefined');

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

		// Debug: Check provider internals
		setTimeout(() => {
			console.log('[Yjs] Debug Info:');
			console.log('  - Room:', webrtcProvider.roomName);
			console.log('  - Connected:', webrtcProvider.connected);
			console.log('  - BroadcastChannel:', webrtcProvider.bcconnected);
			console.log('  - WebRTC Peers:', (webrtcProvider as any).webrtcConns?.size || 0);
			console.log('  - BC Connections:', (webrtcProvider as any).bcConns?.size || 0);
		}, 1000);

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
	<div
		class="status-bar"
		style="padding: 1rem; background: #f5f5f5; border-radius: 8px; margin-bottom: 1rem;"
	>
		<div style="display: flex; align-items: center; gap: 0.5rem;">
			<span
				style="width: 10px; height: 10px; border-radius: 50%; background-color: {connectionColor};"
			></span>
			<span style="font-weight: 500;">{connectionText}</span>
		</div>
		{#if errorMessage}
			<div style="color: red; margin-top: 0.5rem;">{errorMessage}</div>
		{/if}
	</div>

	<!-- Room Header -->
	<div style="margin-bottom: 2rem;">
		<h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem;">Room: {roomId}</h1>
		<p style="color: #666;">Share this URL to invite collaborators</p>
		{#if connectionStatus === 'connected' && peerCount > 0}
			<p style="color: green; margin-top: 0.5rem;">
				{peerCount} peer{peerCount !== 1 ? 's' : ''} connected
			</p>
		{/if}
	</div>

	<!-- Debug Panel (Development Only) -->
	{#if import.meta.env.DEV}
		<div
			style="padding: 1rem; background: #f0f0f0; border-radius: 8px; font-family: monospace; font-size: 0.875rem;"
		>
			<h3 style="font-weight: bold; margin-bottom: 0.5rem;">Debug Info</h3>
			<pre style="margin: 0;">Status: {connectionStatus}
Peers: {peerCount}
Room ID: {roomId}
Doc GUID: {ydoc?.guid || 'Not initialized'}</pre>
		</div>
	{/if}
</div>
