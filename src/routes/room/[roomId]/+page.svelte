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
	const isReadonly = $derived($page.url.searchParams.get('readonly') === '1');

	let ydoc = $state<Y.Doc | null>(null);
	let awareness = $state<any | null>(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let nickname = $state('');
	let editingName = $state(false);
	let errorMessage = $state<string | null>(null);
	let copyFeedback = $state('');
	let copyTimeout: ReturnType<typeof setTimeout> | null = null;

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

	async function copyRoomLink() {
		try {
			if (!navigator.clipboard) throw new Error('Clipboard unavailable');
			await navigator.clipboard.writeText(window.location.href);
			copyFeedback = '링크를 복사했습니다';
		} catch {
			copyFeedback = '주소창의 링크를 복사해 공유하세요';
		}

		if (copyTimeout) clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => (copyFeedback = ''), 5000);
	}

	async function copyReadonlyLink() {
		const url = new URL(window.location.href);
		url.searchParams.set('readonly', '1');

		try {
			if (!navigator.clipboard) throw new Error('Clipboard unavailable');
			await navigator.clipboard.writeText(url.toString());
			copyFeedback = '읽기 전용 링크를 복사했습니다';
		} catch {
			copyFeedback = '주소에 ?readonly=1을 붙여 공유하세요';
		}

		if (copyTimeout) clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => (copyFeedback = ''), 5000);
	}

	function exportCurrentTab() {
		const activeTab = tabs.find((tab) => tab.id === activeTabId);
		const text = document.querySelector('.tiptap')?.textContent?.trim() ?? '';
		const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${activeTab?.name ?? roomId}.txt`;
		link.click();
		URL.revokeObjectURL(url);
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
			try {
				localStorage.removeItem(storageKey());
			} catch {
				// Storage can be unavailable in private or restricted browser contexts.
			}
		}
	}

	function persistLocalDoc(doc: Y.Doc) {
		try {
			localStorage.setItem(storageKey(), updateToBase64(Y.encodeStateAsUpdate(doc)));
		} catch {
			// Keep editing even when local persistence is unavailable.
		}
	}

	function fallbackOrigin() {
		return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
	}

	function connectLocalFallback(doc: Y.Doc) {
		if (typeof BroadcastChannel === 'undefined') {
			doc.on('update', () => persistLocalDoc(doc));
			return () => {};
		}

		const channel = new BroadcastChannel(`syncingsh:${roomId}`);
		const origin = fallbackOrigin();

		const onUpdate = (update: Uint8Array) => {
			persistLocalDoc(doc);
			try {
				channel.postMessage({ origin, update: updateToBase64(update) });
			} catch {
				// Local persistence still protects reload recovery if cross-tab broadcast fails.
			}
		};

		channel.onmessage = (event) => {
			const message = event.data as { origin?: string; update?: string; requestSync?: boolean };
			if (message.origin === origin) return;

			if (message.requestSync) {
				try {
					channel.postMessage({ origin, update: updateToBase64(Y.encodeStateAsUpdate(doc)) });
				} catch {
					// Ignore failed sync responses; the local document remains editable.
				}
				return;
			}

			if (message.update) {
				try {
					Y.applyUpdate(doc, base64ToUpdate(message.update), 'remote');
					persistLocalDoc(doc);
				} catch {
					// Ignore malformed peer updates.
				}
			}
		};

		doc.on('update', onUpdate);
		try {
			channel.postMessage({ origin, requestSync: true });
		} catch {
			// Broadcast sync is best-effort.
		}

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
	<header class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
		<div class="flex flex-wrap items-center gap-2 sm:justify-end">
			<button
				onclick={copyRoomLink}
				title="방 링크 복사"
				class="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
			>
				링크 복사
			</button>
			<button
				onclick={copyReadonlyLink}
				title="읽기 전용 방 링크 복사"
				class="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
			>
				읽기 전용 링크
			</button>
			<button
				onclick={exportCurrentTab}
				title="현재 문서 내보내기"
				class="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
			>
				내보내기
			</button>
			{#if copyFeedback}
				<span class="text-xs text-green-600" aria-live="polite">{copyFeedback}</span>
			{/if}
			{#if awareness}
				<Presence {awareness} />
			{/if}
		</div>
	</header>

	{#if errorMessage}
		<div class="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
			<p>{errorMessage}</p>
			<p class="mt-1 text-xs">같은 브라우저 탭끼리는 계속 동기화되고, 새로고침해도 복구됩니다.</p>
		</div>
	{/if}

	{#if isReadonly}
		<div class="mb-4 rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
			읽기 전용 모드입니다. 문서를 볼 수 있지만 편집할 수 없습니다.
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
				<Editor fragment={activeFragment} editable={!isReadonly} />
			{/key}
		{/if}
	{:else if connectionStatus === 'connecting'}
		<div class="flex h-64 items-center justify-center text-gray-400">서버에 연결 중입니다...</div>
	{:else if connectionStatus === 'disconnected'}
		<div class="flex h-64 items-center justify-center text-red-400">
			연결이 끊어졌습니다. 새로고침 해보세요.
		</div>
	{:else if connectionStatus === 'error'}
		<div class="flex h-64 items-center justify-center text-amber-600">
			로컬 모드로 실행 중입니다. 이 브라우저에서만 편집 내용이 저장되며, 서버에는 아무 데이터도 남지
			않습니다.
		</div>
	{:else}
		<div class="flex h-64 items-center justify-center text-gray-400">문서를 불러오는 중...</div>
	{/if}
</div>
