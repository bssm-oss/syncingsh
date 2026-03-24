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

	const statusColor = $derived(
		connectionStatus === 'connected'
			? '#22c55e'
			: connectionStatus === 'connecting'
				? '#eab308'
				: connectionStatus === 'error'
					? '#ef4444'
					: '#9ca3af'
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

	onMount(() => {
		if (!roomId) return;

		nickname = getNickname();
		const userColor = getUserColor();
		const doc = new Y.Doc();

		const signalingUrls = import.meta.env.DEV
			? [`ws://${window.location.hostname}:4444`]
			: [
					'wss://syncingsh-signaling.onrender.com',
					'wss://y-webrtc-signaling.onrender.com'
				];

		const iceServers: { urls: string; username?: string; credential?: string }[] = [
			{ urls: 'stun:stun.l.google.com:19302' },
			{ urls: 'stun:stun1.l.google.com:19302' }
		];

		const turnUrl = import.meta.env.VITE_TURN_URL;
		const turnUser = import.meta.env.VITE_TURN_USERNAME;
		const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
		if (turnUrl && turnUser && turnCred) {
			iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
		}

		const webrtcProvider = new WebrtcProvider(roomId, doc, {
			signaling: signalingUrls,
			peerOpts: {
				config: { iceServers }
			},
			maxConns: 20,
			filterBcConns: false
		});

		webrtcProvider.on('synced', () => {
			connectionStatus = 'connected';
		});

		webrtcProvider.on('status', (event: { connected: boolean }) => {
			connectionStatus = event.connected ? 'connected' : 'connecting';
		});

		// Set local user info for presence
		webrtcProvider.awareness.setLocalStateField('user', {
			name: nickname,
			color: userColor
		});

		ydoc = doc;
		awareness = webrtcProvider.awareness;
		connectionStatus = 'connecting';

		return () => {
			webrtcProvider.disconnect();
			webrtcProvider.destroy();
			doc.destroy();
		};
	});
</script>

<div class="mx-auto max-w-4xl px-4 py-6">
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
							class="w-32 rounded border border-gray-300 px-2 py-0.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
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
