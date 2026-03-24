<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Y from 'yjs';
	import { WebrtcProvider } from 'y-webrtc';
	import Editor from '$lib/components/Editor.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import Presence from '$lib/components/Presence.svelte';
	import { getNickname, setNickname, getUserColor } from '$lib/utils/nickname';
	import type { ConnectionStatus } from '$lib/types/yjs';
	import type { Awareness } from 'y-protocols/awareness';

	interface TabMeta {
		id: string;
		name: string;
		createdAt: number;
	}

	const roomId = $derived($page.params.roomId);

	let ydoc = $state<Y.Doc | null>(null);
	let awareness = $state<Awareness | null>(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let nickname = $state('');
	let editingName = $state(false);

	let tabs = $state<TabMeta[]>([]);
	let activeTabId = $state<string>('');
	let yTabs: Y.Array<TabMeta> | null = null;

	const activeFragment = $derived.by(() => {
		if (!ydoc || !activeTabId) return null;
		return ydoc.getXmlFragment(`tab-${activeTabId}`);
	});

	const statusColor = $derived(
		connectionStatus === 'connected'
			? '#22c55e'
			: connectionStatus === 'connecting'
				? '#eab308'
				: connectionStatus === 'error'
					? '#ef4444'
					: '#9ca3af'
	);

	function generateTabId(): string {
		return Math.random().toString(36).substring(2, 10);
	}

	function syncTabsFromYjs() {
		if (!yTabs) return;
		const arr: TabMeta[] = [];
		for (let i = 0; i < yTabs.length; i++) {
			arr.push(yTabs.get(i));
		}
		tabs = arr;

		// If active tab was removed, switch to the first available
		if (tabs.length > 0 && !tabs.find((t) => t.id === activeTabId)) {
			activeTabId = tabs[0].id;
		}
	}

	function addTab() {
		if (!ydoc || !yTabs) return;
		const id = generateTabId();
		const newTab: TabMeta = {
			id,
			name: `문서 ${tabs.length + 1}`,
			createdAt: Date.now()
		};
		yTabs.push([newTab]);
		activeTabId = id;
	}

	function closeTab(tabId: string) {
		if (!ydoc || !yTabs) return;
		if (tabs.length <= 1) return;

		// Check if the tab's fragment has content
		const fragment = ydoc.getXmlFragment(`tab-${tabId}`);
		const hasContent = fragment.length > 0;

		if (hasContent && !confirm('이 탭에 내용이 있습니다. 삭제하시겠습니까?')) {
			return;
		}

		const index = tabs.findIndex((t) => t.id === tabId);
		if (index === -1) return;

		// Switch to adjacent tab before removing
		if (activeTabId === tabId) {
			const nextIndex = index > 0 ? index - 1 : 1;
			activeTabId = tabs[nextIndex].id;
		}

		yTabs.delete(index, 1);

		// Clean up the fragment data
		ydoc.transact(() => {
			const frag = ydoc!.getXmlFragment(`tab-${tabId}`);
			frag.delete(0, frag.length);
		});
	}

	function renameTab(tabId: string, newName: string) {
		if (!yTabs) return;
		const index = tabs.findIndex((t) => t.id === tabId);
		if (index === -1) return;

		const existing = yTabs.get(index);
		yTabs.delete(index, 1);
		yTabs.insert(index, [{ ...existing, name: newName }]);
	}

	function switchTab(tabId: string) {
		activeTabId = tabId;
	}

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

		const webrtcProvider = new WebrtcProvider(roomId, doc, {
			signaling: signalingUrls,
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

		// Initialize tabs from Yjs
		yTabs = doc.getArray<TabMeta>('tabs');

		// If no tabs exist, create the default one
		if (yTabs.length === 0) {
			const defaultId = generateTabId();
			yTabs.push([
				{
					id: defaultId,
					name: '문서 1',
					createdAt: Date.now()
				}
			]);
			activeTabId = defaultId;
		} else {
			activeTabId = yTabs.get(0).id;
		}

		syncTabsFromYjs();

		yTabs.observe(() => {
			syncTabsFromYjs();
		});

		return () => {
			webrtcProvider.disconnect();
			webrtcProvider.destroy();
			doc.destroy();
		};
	});
</script>

<div class="mx-auto max-w-4xl px-4 py-6">
	<header class="mb-4 flex items-center justify-between">
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

	{#if ydoc && tabs.length > 0}
		<TabBar
			{tabs}
			{activeTabId}
			onswitch={switchTab}
			onadd={addTab}
			onclose={closeTab}
			onrename={renameTab}
		/>

		{#if activeFragment}
			{#key activeTabId}
				<Editor fragment={activeFragment} />
			{/key}
		{/if}
	{:else}
		<div class="flex h-64 items-center justify-center text-gray-400">연결 중...</div>
	{/if}
</div>
