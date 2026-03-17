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
	import type { Editor as TiptapEditor } from '@tiptap/core';
	import TurndownService from 'turndown';

	const roomId = $derived($page.params.roomId);

	let ydoc = $state<Y.Doc | null>(null);
	let awareness = $state<Awareness | null>(null);
	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let nickname = $state('');
	let editingName = $state(false);
	let editorInstance = $state<TiptapEditor | null>(null);
	let showExportMenu = $state(false);
	let fileInput: HTMLInputElement;

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

	function exportMarkdown() {
		if (!editorInstance) return;
		const html = editorInstance.getHTML();
		const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
		const markdown = td.turndown(html);
		const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${roomId}.md`;
		a.click();
		URL.revokeObjectURL(url);
		showExportMenu = false;
	}

	function exportPdf() {
		window.print();
		showExportMenu = false;
	}

	function triggerImport() {
		fileInput.click();
	}

	function handleImport(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !editorInstance) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			const text = e.target?.result as string;
			if (!text) return;
			// Insert as plain text paragraphs — works for both .md and .txt
			editorInstance!.commands.setContent(
				text
					.split('\n')
					.map((line) => `<p>${line || '<br>'}</p>`)
					.join('')
			);
		};
		reader.readAsText(file);
		// Reset so the same file can be re-imported
		input.value = '';
	}

	onMount(() => {
		if (!roomId) return;

		nickname = getNickname();
		const userColor = getUserColor();
		const doc = new Y.Doc();

		const signalingUrl = import.meta.env.DEV
			? `ws://${window.location.hostname}:4444`
			: 'wss://signaling.yjs.dev';

		const webrtcProvider = new WebrtcProvider(roomId, doc, {
			signaling: [signalingUrl],
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

			<!-- Import -->
			<button
				onclick={triggerImport}
				class="text-sm text-gray-500 hover:text-gray-900"
				disabled={!editorInstance}
			>
				가져오기
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept=".md,.txt"
				class="hidden"
				onchange={handleImport}
			/>

			<!-- Export dropdown -->
			<div class="relative">
				<button
					onclick={() => (showExportMenu = !showExportMenu)}
					class="text-sm text-gray-500 hover:text-gray-900"
					disabled={!editorInstance}
				>
					내보내기
				</button>
				{#if showExportMenu}
					<div
						class="absolute right-0 z-10 mt-1 w-32 rounded border border-gray-200 bg-white shadow-sm"
					>
						<button
							onclick={exportMarkdown}
							class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
						>
							Markdown (.md)
						</button>
						<button
							onclick={exportPdf}
							class="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
						>
							PDF (인쇄)
						</button>
					</div>
				{/if}
			</div>
		</div>
	</header>

	{#if ydoc}
		<Editor {ydoc} bind:editorInstance />
	{:else}
		<div class="flex h-64 items-center justify-center text-gray-400">연결 중...</div>
	{/if}
</div>

<!-- Print styles: show only editor content when printing -->
<style>
	@media print {
		:global(body > *:not(.print-area)) {
			display: none;
		}

		:global(.mx-auto) {
			padding: 0;
			max-width: none;
		}

		:global(header) {
			display: none;
		}
	}
</style>
