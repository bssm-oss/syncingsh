<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { generateRoomCode, isValidRoomCode } from '$lib/utils/roomCode';
	import { getNickname, setNickname, hasCustomNickname } from '$lib/utils/nickname';

	let joinCode = $state('');
	let nickname = $state('');
	let error = $state('');

	onMount(() => {
		nickname = hasCustomNickname() ? getNickname() : '';
	});

	function saveAndGo(path: string) {
		const trimmed = nickname.trim();
		if (trimmed) {
			setNickname(trimmed);
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- path is already resolved by callers
		goto(path);
	}

	function createRoom() {
		const code = generateRoomCode();
		saveAndGo(resolve('/room/[roomId]', { roomId: code }));
	}

	function joinRoom() {
		const code = joinCode.trim().toLowerCase();
		if (!isValidRoomCode(code)) {
			error = '올바른 방 코드를 입력해주세요';
			return;
		}
		error = '';
		saveAndGo(resolve('/room/[roomId]', { roomId: code }));
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-sm space-y-8 px-4">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">syncingsh</h1>
			<p class="mt-2 text-gray-500">실시간 공유 메모장</p>
		</div>

		<div class="space-y-2">
			<label for="nickname" class="block text-sm font-medium text-gray-700">닉네임</label>
			<input
				id="nickname"
				type="text"
				bind:value={nickname}
				placeholder="닉네임을 입력하세요"
				maxlength={20}
				class="w-full rounded-lg border border-gray-300 px-4 py-3 text-center focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
			/>
			<p class="text-center text-xs text-gray-400">미입력 시 랜덤 닉네임이 부여됩니다</p>
		</div>

		<button
			onclick={createRoom}
			class="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white transition hover:bg-gray-800"
		>
			새 방 만들기
		</button>

		<div class="flex items-center gap-3">
			<div class="h-px flex-1 bg-gray-200"></div>
			<span class="text-sm text-gray-400">또는</span>
			<div class="h-px flex-1 bg-gray-200"></div>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				joinRoom();
			}}
			class="space-y-3"
		>
			<input
				type="text"
				bind:value={joinCode}
				placeholder="방 코드 입력"
				class="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-widest placeholder:text-sm placeholder:tracking-normal focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
			/>
			{#if error}
				<p class="text-center text-sm text-red-500">{error}</p>
			{/if}
			<button
				type="submit"
				class="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-100"
			>
				참여하기
			</button>
		</form>
	</div>
</div>
