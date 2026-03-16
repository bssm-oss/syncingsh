import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render landing page with create and join options', async () => {
		render(Page);

		const title = page.getByText('syncingsh');
		await expect.element(title).toBeInTheDocument();

		const createButton = page.getByText('새 방 만들기');
		await expect.element(createButton).toBeInTheDocument();

		const joinButton = page.getByText('참여하기');
		await expect.element(joinButton).toBeInTheDocument();
	});
});
