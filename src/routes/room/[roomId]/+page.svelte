<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import * as Y from 'yjs';
	import { createClient } from '@liveblocks/client';
	import { getYjsProviderForRoom } from '@liveblocks/yjs';
	import Editor from '$lib/components/Editor.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import Presence from '$lib/components/Presence.svelte';
	import { getNickname, setNickname, getUserColor } from '$lib/utils/nickname';
	import type { ConnectionStatus } from '$lib/types/yjs';

	interface TabMeta {
		id: string;
		name: string;
		createdAt: number;
	}

	const roomId = $derived($page.params.roomId);

	let ydoc = $state<Y.Doc | null>(null);
	let awareness = $state<any | null>(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let nickname = $state('');
	let editingName = $state(false);
	let errorMessage = $state<string | null>(null);

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
		const seen = new Set<string>();
		const arr: TabMeta[] = [];
		for (let i = 0; i < yTabs.length; i++) {
			const t = yTabs.get(i);
			if (!seen.has(t.id)) {
				seen.add(t.id);
				arr.push(t);
			}
		}
		tabs = arr;

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

		const fragment = ydoc.getXmlFragment(`tab-${tabId}`);
		const hasContent = fragment.length > 0;

		if (hasContent && !confirm('이 탭에 내용이 있습니다. 삭제하시겠습니까?')) {
			return;
		}

		const index = tabs.findIndex((t) => t.id === tabId);
		if (index === -1) return;

		if (activeTabId === tabId) {
			const nextIndex = index > 0 ? index - 1 : 1;
			activeTabId = tabs[nextIndex].id;
		}

		yTabs.delete(index, 1);

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

	function storageKey() {
		return `syncingsh_room_${roomId}`;
	}

	function updateToBase64(update: Uint8Array): string {
		let binary = '';
		for (const byte of update) binary += String.fromCharCode(byte);
		return btoa(binary);
	}

	function base64ToUpdate(value: string): Uint8Array {
		const binary = atob(value);
		return Uint8Array.from(binary, (char) => char.charCodeAt(0));
	}

	function restoreLocalDoc(doc: Y.Doc) {
		try {
			const stored = localStorage.getItem(storageKey());
			if (stored) Y.applyUpdate(doc, base64ToUpdate(stored));
		} catch {
			localStorage.removeItem(storageKey());
		}
	}

	function persistLocalDoc(doc: Y.Doc) {
		localStorage.setItem(storageKey(), updateToBase64(Y.encodeStateAsUpdate(doc)));
	}

	function connectLocalFallback(doc: Y.Doc) {
		const channel = new BroadcastChannel(`syncingsh:${roomId}`);
		const origin = crypto.randomUUID();

		const onUpdate = (update: Uint8Array) => {
			persistLocalDoc(doc);
			channel.postMessage({ origin, update: updateToBase64(update) });
		};

		channel.onmessage = (event) => {
			const message = event.data as { origin?: string; update?: string; requestSync?: boolean };
			if (message.origin === origin) return;

			if (message.requestSync) {
				channel.postMessage({ origin, update: updateToBase64(Y.encodeStateAsUpdate(doc)) });
				return;
			}

			if (message.update) {
				Y.applyUpdate(doc, base64ToUpdate(message.update), 'remote');
				persistLocalDoc(doc);
			}
		};

		doc.on('update', onUpdate);
		channel.postMessage({ origin, requestSync: true });

		return () => {
			doc.off('update', onUpdate);
			channel.close();
		};
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
		restoreLocalDoc(doc);
		let cleanupLocalFallback = connectLocalFallback(doc);
		let cleanupProvider = () => {};

		ydoc = doc;
		yTabs = doc.getArray<TabMeta>('tabs');

		const initTabs = () => {
			if (!yTabs) return;
			const DEFAULT_TAB_ID = 'default';
			const hasDefault = Array.from({ length: yTabs.length }, (_, i) => yTabs!.get(i)).some(
				(t) => t.id === DEFAULT_TAB_ID
			);
			if (!hasDefault) {
				yTabs.push([{ id: DEFAULT_TAB_ID, name: '문서 1', createdAt: Date.now() }]);
			}
			activeTabId = DEFAULT_TAB_ID;
			syncTabsFromYjs();
			yTabs.observe(() => syncTabsFromYjs());
		};

		initTabs();

		const publicKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;
		if (!publicKey) {
			connectionStatus = 'error';
			errorMessage = 'Liveblocks 공개 키가 없어 이 브라우저의 로컬 복구 모드로 실행 중입니다.';
			return () => {
				cleanupLocalFallback();
				doc.destroy();
			};
		}

		const client = createClient({
			publicApiKey: publicKey
		});

		const { room, leave } = client.enterRoom(roomId);
		const provider = getYjsProviderForRoom(room);
		const liveblocksDoc = provider.getYDoc();
		restoreLocalDoc(liveblocksDoc);
		cleanupLocalFallback();
		cleanupLocalFallback = connectLocalFallback(liveblocksDoc);

		const mapStatus = (status: string) => {
			if (status === 'connected') connectionStatus = 'connected';
			else if (status === 'connecting' || status === 'reconnecting')
				connectionStatus = 'connecting';
			else if (status === 'disconnected') connectionStatus = 'disconnected';
		};

		mapStatus(room.getStatus());
		const unsubscribeStatus = room.subscribe('status', mapStatus);

		provider.awareness.setLocalStateField('user', {
			name: nickname,
			color: userColor
		});

		ydoc = liveblocksDoc;
		awareness = provider.awareness;
		connectionStatus = 'connecting';

		yTabs = liveblocksDoc.getArray<TabMeta>('tabs');

		if (provider.synced) {
			initTabs();
		} else {
			const onSynced = () => {
				provider.off('sync', onSynced);
				initTabs();
			};
			provider.on('sync', onSynced);
		}

		cleanupProvider = () => {
			unsubscribeStatus();
			leave();
		};

		return () => {
			cleanupProvider();
			cleanupLocalFallback();
			liveblocksDoc.destroy();
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

	{#if errorMessage}
		<div class="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			{errorMessage}
		</div>
	{/if}

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
