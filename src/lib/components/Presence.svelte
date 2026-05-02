<script lang="ts">
	import { onMount } from 'svelte';

	interface AwarenessLike {
		getStates(): Map<number, unknown>;
		on(event: string, cb: () => void): void;
		off(event: string, cb: () => void): void;
		clientID?: number;
		doc?: { clientID: number };
	}

	interface Props {
		awareness: AwarenessLike;
	}

	let { awareness }: Props = $props();

	interface User {
		name: string;
		color: string;
	}

	let users = $state<User[]>([]);

	function isSafeUserColor(value: unknown): value is string {
		if (typeof value !== 'string') return false;
		const match = /^hsl\((\d{1,3}), 70%, 60%\)$/.exec(value);
		if (!match) return false;
		const hue = Number(match[1]);
		return Number.isInteger(hue) && hue >= 0 && hue <= 359;
	}

	function normalizeUser(value: unknown): User | null {
		if (!value || typeof value !== 'object') return null;
		const user = value as Partial<User>;
		if (typeof user.name !== 'string') return null;
		if (!isSafeUserColor(user.color)) return null;
		const name = user.name.trim().slice(0, 20);
		if (!name) return null;
		return { name, color: user.color };
	}

	onMount(() => {
		const update = () => {
			const states = awareness.getStates();
			const localId = awareness.clientID ?? awareness.doc?.clientID;
			const result: User[] = [];

			states.forEach((state, clientId) => {
				if (
					clientId === localId ||
					state === null ||
					typeof state !== 'object' ||
					!('user' in state)
				) {
					return;
				}
				const user = normalizeUser(state.user);
				if (user) result.push(user);
			});

			users = result;
		};

		awareness.on('change', update);
		update();

		return () => {
			awareness.off('change', update);
		};
	});
</script>

<div class="flex items-center gap-1.5">
	{#if users.length > 0}
		{#each users as user (user.name)}
			<span
				class="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
				style="background-color: {user.color}"
				title={user.name}
			>
				{user.name.charAt(0).toUpperCase()}
			</span>
		{/each}
		<span class="ml-1 text-sm text-gray-500">{users.length}명</span>
	{:else}
		<span class="text-xs text-gray-400">나만 접속 중</span>
	{/if}
</div>
