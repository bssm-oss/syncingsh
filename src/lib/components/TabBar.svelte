<script lang="ts">
	interface TabMeta {
		id: string;
		name: string;
		createdAt: number;
	}

	interface Props {
		tabs: TabMeta[];
		activeTabId: string;
		onswitch: (tabId: string) => void;
		onadd: () => void;
		onclose: (tabId: string) => void;
		onrename: (tabId: string, newName: string) => void;
	}

	let { tabs, activeTabId, onswitch, onadd, onclose, onrename }: Props = $props();

	let editingTabId = $state<string | null>(null);
	let editingName = $state('');

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
	}

	function startRename(tab: TabMeta) {
		editingTabId = tab.id;
		editingName = tab.name;
	}

	function commitRename() {
		if (editingTabId && editingName.trim()) {
			onrename(editingTabId, editingName.trim());
		}
		editingTabId = null;
		editingName = '';
	}

	function handleClose(e: Event, tabId: string) {
		e.stopPropagation();
		onclose(tabId);
	}
</script>

<div class="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 pt-2">
	<div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
		{#each tabs as tab (tab.id)}
			<button
				class="group flex max-w-48 min-w-0 shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-1.5 text-sm transition-colors {tab.id ===
				activeTabId
					? 'border-gray-200 bg-white text-gray-900'
					: 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'}"
				onclick={() => onswitch(tab.id)}
				ondblclick={() => startRename(tab)}
			>
				{#if editingTabId === tab.id}
					<form
						onsubmit={(e) => {
							e.preventDefault();
							commitRename();
						}}
						class="min-w-0"
					>
						<input
							type="text"
							bind:value={editingName}
							onblur={commitRename}
							onkeydown={(e) => {
								if (e.key === 'Escape') {
									editingTabId = null;
									editingName = '';
								}
							}}
							class="w-24 rounded border border-gray-300 px-1 py-0 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
							use:focusOnMount
						/>
					</form>
				{:else}
					<span class="truncate">{tab.name}</span>
				{/if}
				{#if tabs.length > 1}
					<span
						role="button"
						tabindex="0"
						class="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 {tab.id ===
						activeTabId
							? 'opacity-60'
							: ''}"
						onclick={(e) => handleClose(e, tab.id)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') handleClose(e, tab.id);
						}}
						title="탭 닫기"
					>
						&times;
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<button
		onclick={onadd}
		class="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
		title="새 탭 추가"
	>
		+
	</button>
</div>
