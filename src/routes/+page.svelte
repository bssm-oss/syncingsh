<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		const uuid = crypto.randomUUID();
		const roomId = uuid.slice(0, 8);
		goto(`/room/${roomId}`);
	});
</script>

<p>Redirecting to your room...</p>
