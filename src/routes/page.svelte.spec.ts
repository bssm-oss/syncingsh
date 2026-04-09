import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render landing page title and description', async () => {
		render(Page);

		await expect.element(page.getByText('syncingsh')).toBeInTheDocument();
		await expect.element(page.getByText('실시간 공유 메모장')).toBeInTheDocument();
	});

	it('should have create room and join buttons', async () => {
		render(Page);

		await expect.element(page.getByText('새 방 만들기')).toBeInTheDocument();
		await expect.element(page.getByText('참여하기')).toBeInTheDocument();
	});

	it('should have a room code input field', async () => {
		render(Page);

		const input = page.getByPlaceholder('방 코드 입력');
		await expect.element(input).toBeInTheDocument();
	});

	it('should show error for invalid room code', async () => {
		render(Page);

		const input = page.getByPlaceholder('방 코드 입력');
		await input.fill('a');

		const joinButton = page.getByText('참여하기');
		await joinButton.click();

		await expect.element(page.getByText('올바른 방 코드를 입력해주세요')).toBeInTheDocument();
	});
});
