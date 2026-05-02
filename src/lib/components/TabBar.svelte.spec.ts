import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TabBar from './TabBar.svelte';

const tabs = [
	{ id: 'default', name: '문서 1', createdAt: 1 },
	{ id: 'second', name: '문서 2', createdAt: 2 }
];

describe('TabBar', () => {
	it('hides mutating controls in read-only mode', async () => {
		const onadd = vi.fn();
		render(TabBar, {
			tabs,
			activeTabId: 'default',
			readonly: true,
			onswitch: vi.fn(),
			onadd,
			onclose: vi.fn(),
			onrename: vi.fn()
		});

		await expect.element(page.getByText('문서 1')).toBeInTheDocument();
		await expect.element(page.getByTitle('새 탭 추가')).not.toBeInTheDocument();
		await expect.element(page.getByTitle('탭 닫기')).not.toBeInTheDocument();
		expect(onadd).not.toHaveBeenCalled();
	});

	it('keeps switching available in read-only mode', async () => {
		const onswitch = vi.fn();
		render(TabBar, {
			tabs,
			activeTabId: 'default',
			readonly: true,
			onswitch,
			onadd: vi.fn(),
			onclose: vi.fn(),
			onrename: vi.fn()
		});

		await page.getByText('문서 2').click();

		expect(onswitch).toHaveBeenCalledWith('second');
	});
});
