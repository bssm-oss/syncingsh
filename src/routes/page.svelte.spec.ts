import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render landing page title and description', async () => {
		render(Page);

		await expect.element(page.getByText('Free Online Shared Notepad')).toBeInTheDocument();
		await expect
			.element(
				page.getByText(
					'Create a shared notepad, invite others with a link, and write together in real time.'
				)
			)
			.toBeInTheDocument();
	});

	it('should render SharedPad SEO metadata', () => {
		render(Page);

		expect(document.title).toBe('SharedPad - Free Online Shared Notepad');
		expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
			'Create a shared notepad, invite others with a link, and write together in real time.'
		);
		expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
			'https://sharedpad.justn.me'
		);
		expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
			'SharedPad - Free Online Shared Notepad'
		);
		expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
			'https://sharedpad.justn.me'
		);
		expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
			'summary'
		);
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
