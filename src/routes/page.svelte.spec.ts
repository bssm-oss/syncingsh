import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render redirect message', async () => {
		render(Page);

		const message = page.getByText('Redirecting to your room...');
		await expect.element(message).toBeInTheDocument();
	});
});
