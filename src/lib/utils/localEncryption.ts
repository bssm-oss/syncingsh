const KEY_HASH_PARAM = 'key';
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;

export interface EncryptedEnvelope {
	v: 1;
	alg: 'AES-GCM';
	iv: string;
	data: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string): Uint8Array {
	const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
	const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
	return (
		!!value &&
		typeof value === 'object' &&
		(value as EncryptedEnvelope).v === 1 &&
		(value as EncryptedEnvelope).alg === 'AES-GCM' &&
		typeof (value as EncryptedEnvelope).iv === 'string' &&
		typeof (value as EncryptedEnvelope).data === 'string'
	);
}

export function generateRoomKey(): string {
	const key = new Uint8Array(KEY_BYTE_LENGTH);
	crypto.getRandomValues(key);
	return bytesToBase64Url(key);
}

export function ensureRoomKey(url: URL): string {
	const existingKey = url.hash.startsWith('#')
		? new URLSearchParams(url.hash.slice(1)).get(KEY_HASH_PARAM)
		: null;

	if (existingKey) return existingKey;

	const generatedKey = generateRoomKey();
	const hashParams = new URLSearchParams(url.hash.slice(1));
	hashParams.set(KEY_HASH_PARAM, generatedKey);
	url.hash = hashParams.toString();
	history.replaceState(history.state, '', url);
	return generatedKey;
}

export function parseEncryptedEnvelope(value: string): EncryptedEnvelope | null {
	try {
		const parsed = JSON.parse(value) as unknown;
		return isEncryptedEnvelope(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export async function importRoomKey(roomKey: string): Promise<CryptoKey> {
	const keyBytes = base64UrlToBytes(roomKey);
	if (keyBytes.byteLength !== KEY_BYTE_LENGTH) throw new Error('Invalid room key length');

	return crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), 'AES-GCM', false, [
		'encrypt',
		'decrypt'
	]);
}

export async function encryptBytes(
	key: CryptoKey,
	plaintext: Uint8Array
): Promise<EncryptedEnvelope> {
	const iv = new Uint8Array(IV_BYTE_LENGTH);
	crypto.getRandomValues(iv);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: toArrayBuffer(iv) },
		key,
		toArrayBuffer(plaintext)
	);

	return {
		v: 1,
		alg: 'AES-GCM',
		iv: bytesToBase64Url(iv),
		data: bytesToBase64Url(new Uint8Array(ciphertext))
	};
}

export async function decryptEnvelope(
	key: CryptoKey,
	envelope: EncryptedEnvelope
): Promise<Uint8Array> {
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: toArrayBuffer(base64UrlToBytes(envelope.iv)) },
		key,
		toArrayBuffer(base64UrlToBytes(envelope.data))
	);

	return new Uint8Array(plaintext);
}

export function serializeEnvelope(envelope: EncryptedEnvelope): string {
	return JSON.stringify(envelope);
}

export function updateToBase64(update: Uint8Array): string {
	let binary = '';
	for (const byte of update) binary += String.fromCharCode(byte);
	return btoa(binary);
}

export function base64ToUpdate(value: string): Uint8Array {
	const binary = atob(value);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
