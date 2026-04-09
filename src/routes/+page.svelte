<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolveRoute } from '$app/paths';
	import { generateRoomCode, isValidRoomCode } from '$lib/utils/roomCode';

	let joinCode = $state('');
	let error = $state('');
	let showCustomCode = $state(false);
	let customCode = $state('');
	let createError = $state('');

	function createRoom() {
		if (showCustomCode && customCode.trim()) {
			const code = customCode.trim().toLowerCase();
			if (!isValidRoomCode(code)) {
				createError = '영문 소문자, 숫자만 사용 가능 (2~20자)';
				return;
			}
			createError = '';
			goto(resolveRoute('/room/[roomId]', { roomId: code }));
		} else {
			const code = generateRoomCode();
			goto(resolveRoute('/room/[roomId]', { roomId: code }));
		}
	}

	function joinRoom() {
		const code = joinCode.trim().toLowerCase();
		if (!isValidRoomCode(code)) {
			error = '올바른 방 코드를 입력해주세요';
			return;
		}
		error = '';
		goto(resolveRoute('/room/[roomId]', { roomId: code }));
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-sm space-y-8 px-4">
		<div class="text-center">
			<h1 class="text-3xl font-bold text-gray-900">syncingsh</h1>
			<p class="mt-2 text-gray-500">실시간 공유 메모장</p>
		</div>

		<div class="space-y-3">
			{#if showCustomCode}
				<div class="space-y-2">
					<input
						type="text"
						bind:value={customCode}
						placeholder="원하는 방 코드 입력 (예: godfield)"
						class="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-widest placeholder:text-sm placeholder:tracking-normal focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
					/>
					<p class="text-center text-xs text-gray-400">
						영문 소문자, 숫자만 사용 가능 (2~20자) · 비우면 랜덤 생성
					</p>
					{#if createError}
						<p class="text-center text-sm text-red-500">{createError}</p>
					{/if}
				</div>
			{/if}
			<button
				onclick={createRoom}
				class="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white transition hover:bg-gray-800"
			>
				{showCustomCode ? '방 만들기' : '새 방 만들기'}
			</button>
			{#if !showCustomCode}
				<button
					onclick={() => (showCustomCode = true)}
					class="w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
				>
					코드를 직접 정하고 싶다면?
				</button>
			{/if}
		</div>

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
