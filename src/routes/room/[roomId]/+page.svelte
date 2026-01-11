<script lang="ts">
	import { page } from '$app/stores';

	const roomId = $derived($page.params.roomId);
</script>

<div>
	<h1>Room: {roomId}</h1>
	<p>Welcome to your collaborative space!</p>
</div>
