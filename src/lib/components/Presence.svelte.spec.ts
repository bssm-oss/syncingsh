import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Presence from './Presence.svelte';

interface AwarenessLike {
	getStates(): Map<number, unknown>;
	on(event: string, cb: () => void): void;
	off(event: string, cb: () => void): void;
	clientID?: number;
}

function awarenessWith(states: Map<number, unknown>): AwarenessLike {
	return {
		clientID: 1,
		getStates: () => states,
		on: () => undefined,
		off: () => undefined
	};
}

describe('Presence', () => {
	it('renders valid remote users', async () => {
		render(Presence, {
			awareness: awarenessWith(
				new Map([
					[1, { user: { name: 'Local', color: 'hsl(0, 70%, 60%)' } }],
					[2, { user: { name: 'Remote', color: 'hsl(120, 70%, 60%)' } }]
				])
			)
		});

		await expect.element(page.getByTitle('Remote')).toBeInTheDocument();
		await expect.element(page.getByText('1명')).toBeInTheDocument();
	});

	it('ignores malformed users and unsafe colors', async () => {
		render(Presence, {
			awareness: awarenessWith(
				new Map([
					[2, { user: { name: 'BadColor', color: 'red; position: fixed' } }],
					[3, { user: { name: 123, color: 'hsl(120, 70%, 60%)' } }],
					[4, { user: { name: 'InvalidHue', color: 'hsl(999, 70%, 60%)' } }]
				])
			)
		});

		await expect.element(page.getByText('나만 접속 중')).toBeInTheDocument();
	});
});
