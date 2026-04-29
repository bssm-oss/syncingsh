import { describe, expect, test } from 'vitest';
import {
	ensureRoomKey,
	ensureWriteCapability,
	removeWriteCapability,
	signText,
	verifyTextSignature
} from './localEncryption';

describe('encrypted room capabilities', () => {
	function sameOriginRoomUrl(path: string) {
		const url = new URL(window.location.href);
		url.pathname = path;
		url.search = '?transport=encrypted';
		url.hash = '';
		return url;
	}

	test('read-only links keep read capability and remove write capability', async () => {
		const url = sameOriginRoomUrl('/room/capability-test');
		const roomKey = ensureRoomKey(url);
		await ensureWriteCapability(url);

		const writerHash = new URLSearchParams(url.hash.slice(1));
		expect(writerHash.get('key')).toBe(roomKey);
		expect(writerHash.get('verifyKey')).toBeTruthy();
		expect(writerHash.get('writeKey')).toBeTruthy();

		const readonlyUrl = removeWriteCapability(url);
		const readonlyHash = new URLSearchParams(readonlyUrl.hash.slice(1));

		expect(readonlyHash.get('key')).toBe(roomKey);
		expect(readonlyHash.get('verifyKey')).toBe(writerHash.get('verifyKey'));
		expect(readonlyHash.get('writeKey')).toBeNull();
	});

	test('read-only capability can verify but cannot sign writes', async () => {
		const writerUrl = sameOriginRoomUrl('/room/signature-test');
		ensureRoomKey(writerUrl);
		const writerCapability = await ensureWriteCapability(writerUrl);
		const readonlyCapability = await ensureWriteCapability(removeWriteCapability(writerUrl));
		const signature = await signText(writerCapability.privateKey!, 'encrypted-payload');

		expect(writerCapability.privateKey).toBeTruthy();
		expect(readonlyCapability.privateKey).toBeNull();
		expect(readonlyCapability.publicKey).toBeTruthy();
		expect(
			await verifyTextSignature(readonlyCapability.publicKey!, 'encrypted-payload', signature)
		).toBe(true);
		expect(await verifyTextSignature(readonlyCapability.publicKey!, 'tampered', signature)).toBe(
			false
		);
	});

	test('read-only mode does not mint writer capability without a verify key', async () => {
		const readonlyUrl = sameOriginRoomUrl('/room/manual-readonly');
		ensureRoomKey(readonlyUrl);
		readonlyUrl.searchParams.set('readonly', '1');

		const capability = await ensureWriteCapability(readonlyUrl, false);
		const hash = new URLSearchParams(readonlyUrl.hash.slice(1));

		expect(capability.privateKey).toBeNull();
		expect(capability.publicKey).toBeNull();
		expect(hash.get('writeKey')).toBeNull();
		expect(hash.get('verifyKey')).toBeNull();
	});
});
