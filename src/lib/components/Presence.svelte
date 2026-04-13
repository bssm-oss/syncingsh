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

	onMount(() => {
		const update = () => {
			const states = awareness.getStates();
			const localId = awareness.clientID ?? awareness.doc?.clientID;
			const result: User[] = [];

			states.forEach((state, clientId) => {
				if (clientId !== localId && state !== null && typeof state === 'object' && 'user' in state && state.user) {
					result.push(state.user as User);
				}
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

{#if users.length > 0}
	<div class="flex items-center gap-1.5">
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
	</div>
{/if}
