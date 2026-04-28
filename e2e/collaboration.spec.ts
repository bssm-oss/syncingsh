import { test, expect, type BrowserContext } from '@playwright/test';

test.describe('Landing page', () => {
	test('should create a new room and navigate to it', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: '새 방 만들기' }).click();

		await expect(page).toHaveURL(/\/room\/[a-z0-9]+/);
		await expect(page.locator('.tiptap')).toBeVisible({ timeout: 10000 });
	});

	test('should join a room by code', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await page.getByPlaceholder('방 코드 입력').fill('abcd1234');
		await page.getByRole('button', { name: '참여하기' }).click();

		await expect(page).toHaveURL('/room/abcd1234');
	});

	test('should show error for invalid room code', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		await page.getByPlaceholder('방 코드 입력').fill('a');
		await page.getByRole('button', { name: '참여하기' }).click();

		await expect(page.getByText('올바른 방 코드를 입력해주세요')).toBeVisible();
	});
});

test.describe('Room page', () => {
	test('should render editor and room header', async ({ page }) => {
		await page.goto('/room/e2e-test-basic');

		await expect(page.getByText('Room: e2e-test-basic')).toBeVisible();
		await expect(page.locator('.tiptap')).toBeVisible({ timeout: 10000 });
	});

	test('should display nickname that is clickable for editing', async ({ page }) => {
		await page.goto('/room/e2e-test-nick');

		// Guest nickname should appear
		const nickButton = page.locator('button', { hasText: /Guest\d+/ });
		await expect(nickButton).toBeVisible({ timeout: 5000 });

		// Click to edit
		await nickButton.click();
		const input = page.locator('input[type="text"]').first();
		await expect(input).toBeVisible();
	});

	test('should allow typing in the editor', async ({ page }) => {
		await page.goto('/room/e2e-test-typing');

		const editor = page.locator('.tiptap');
		await editor.waitFor({ timeout: 10000 });

		await editor.click();
		await page.keyboard.type('Hello syncingsh!');

		await expect(editor).toContainText('Hello syncingsh!');
	});

	test('should apply Markdown input shortcuts', async ({ page }) => {
		await page.goto('/room/e2e-test-markdown-shortcuts');

		const editor = page.locator('.tiptap');
		await editor.waitFor({ timeout: 10000 });

		await editor.click();
		await page.keyboard.type('# Heading');
		await page.keyboard.press('Enter');
		await page.keyboard.type('- Item');
		await page.keyboard.press('Enter');

		await expect(editor.locator('h1')).toContainText('Heading');
		await expect(editor.locator('ul li').filter({ hasText: 'Item' })).toBeVisible();
	});

	test('should show share link feedback', async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, 'clipboard', {
				value: { writeText: async () => undefined },
				configurable: true
			});
		});
		await page.goto('/room/e2e-test-share');
		await page.locator('.tiptap').waitFor({ timeout: 10000 });

		await page.getByRole('button', { name: '링크 복사' }).click();

		await expect(page.getByText('링크를 복사했습니다')).toBeVisible();
	});

	test('should prevent edits in read-only mode', async ({ page }) => {
		await page.goto('/room/e2e-readonly?readonly=1');

		const editor = page.locator('.tiptap');
		await editor.waitFor({ timeout: 10000 });
		await expect(page.getByText('읽기 전용 모드입니다')).toBeVisible();

		await editor.click();
		await page.keyboard.type('Should not appear');

		await expect(editor).not.toContainText('Should not appear');
	});

	test('should show degraded local recovery mode without Liveblocks key', async ({ page }) => {
		test.skip(
			!!process.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
			'Only applies when Liveblocks key is absent'
		);

		await page.goto('/room/e2e-degraded-mode');

		await expect(page.locator('.tiptap')).toBeVisible({ timeout: 10000 });
		await expect(page.getByText('Liveblocks 공개 키가 없어')).toBeVisible();
		await expect(page.getByText('새로고침해도 복구됩니다')).toBeVisible();
	});
});

test.describe('Real-time collaboration (same-browser fallback)', () => {
	test('two tabs should sync content via BroadcastChannel', async ({ context }) => {
		const roomPath = '/room/e2e-sync-test';

		const page1 = await context.newPage();
		const page2 = await context.newPage();

		await page1.goto(roomPath);
		await page2.goto(roomPath);

		// Wait for both editors to load
		const editor1 = page1.locator('.tiptap');
		const editor2 = page2.locator('.tiptap');
		await editor1.waitFor({ timeout: 10000 });
		await editor2.waitFor({ timeout: 10000 });

		// Type in page1
		await editor1.click();
		await page1.keyboard.type('Synced message from tab 1');

		// Verify it appears in page2
		await expect(editor2).toContainText('Synced message from tab 1', { timeout: 10000 });
	});

	test('presence should update when peer connects', async ({ context }) => {
		test.skip(
			!process.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
			'Liveblocks public key is required for presence tests'
		);

		const roomPath = '/room/e2e-presence-test';

		const page1 = await context.newPage();
		await page1.goto(roomPath);
		await page1.locator('.tiptap').waitFor({ timeout: 10000 });

		// Initially no peers
		await expect(page1.getByText(/명/)).not.toBeVisible();

		// Open second tab
		const page2 = await context.newPage();
		await page2.goto(roomPath);
		await page2.locator('.tiptap').waitFor({ timeout: 10000 });

		// page1 should show peer presence
		await expect(page1.getByText(/1명/)).toBeVisible({ timeout: 10000 });
	});
});

test.describe('Liveblocks sync (cross-browser, WebSocket)', () => {
	let context1: BrowserContext;
	let context2: BrowserContext;

	if (!process.env.VITE_LIVEBLOCKS_PUBLIC_KEY) {
		test.skip(true, 'VITE_LIVEBLOCKS_PUBLIC_KEY is required for Liveblocks sync tests');
	}

	test.beforeEach(async ({ browser }) => {
		// Separate browser contexts = separate browsers (no BroadcastChannel)
		context1 = await browser.newContext();
		context2 = await browser.newContext();
	});

	test.afterEach(async () => {
		await context1.close();
		await context2.close();
	});

	test('two separate browsers should sync via Liveblocks WebSocket', async () => {
		const roomPath = '/room/e2e-liveblocks-sync';

		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		await page1.goto(roomPath);
		await page2.goto(roomPath);

		const editor1 = page1.locator('.tiptap');
		const editor2 = page2.locator('.tiptap');
		await editor1.waitFor({ timeout: 10000 });
		await editor2.waitFor({ timeout: 10000 });

		// Wait for Liveblocks connection to establish
		await page1.waitForTimeout(2000);

		// Type in page1
		await editor1.click();
		await page1.keyboard.type('Liveblocks sync works!');

		// Verify it appears in page2 via Liveblocks
		await expect(editor2).toContainText('Liveblocks sync works!', { timeout: 15000 });
	});

	test('presence should work across separate browsers', async () => {
		const roomPath = '/room/e2e-liveblocks-presence';

		const page1 = await context1.newPage();
		await page1.goto(roomPath);
		await page1.locator('.tiptap').waitFor({ timeout: 10000 });

		// No peers initially
		await expect(page1.getByText(/명/)).not.toBeVisible();

		// Connect second browser
		const page2 = await context2.newPage();
		await page2.goto(roomPath);
		await page2.locator('.tiptap').waitFor({ timeout: 10000 });

		// Presence should update via Liveblocks
		await expect(page1.getByText(/1명/)).toBeVisible({ timeout: 15000 });
	});
});

test.describe('Local reload recovery', () => {
	test('should restore room content after reload', async ({ page }) => {
		const roomPath = `/room/e2e-reload-${Date.now()}`;

		await page.goto(roomPath);
		const editor = page.locator('.tiptap');
		await editor.waitFor({ timeout: 10000 });

		await editor.click();
		await page.keyboard.type('Recovered after reload');
		await expect(editor).toContainText('Recovered after reload');

		await page.reload();
		await expect(page.locator('.tiptap')).toContainText('Recovered after reload', {
			timeout: 10000
		});
	});
});
