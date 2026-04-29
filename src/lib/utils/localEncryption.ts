const KEY_HASH_PARAM = 'key';
const WRITE_KEY_HASH_PARAM = 'writeKey';
const VERIFY_KEY_HASH_PARAM = 'verifyKey';
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;

export interface WriteCapability {
	privateKey: CryptoKey | null;
	publicKey: CryptoKey | null;
}

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

function textToBytes(value: string): Uint8Array {
	return new TextEncoder().encode(value);
}

function encodeJson(value: unknown): string {
	return bytesToBase64Url(textToBytes(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T {
	const bytes = base64UrlToBytes(value);
	return JSON.parse(new TextDecoder().decode(bytes)) as T;
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

export function removeWriteCapability(url: URL): URL {
	const nextUrl = new URL(url.toString());
	const hashParams = new URLSearchParams(nextUrl.hash.slice(1));
	hashParams.delete(WRITE_KEY_HASH_PARAM);
	nextUrl.hash = hashParams.toString();
	return nextUrl;
}

export async function ensureWriteCapability(
	url: URL,
	allowGenerate = true
): Promise<WriteCapability> {
	const hashParams = new URLSearchParams(url.hash.slice(1));
	const existingPrivateKey = hashParams.get(WRITE_KEY_HASH_PARAM);
	const existingPublicKey = hashParams.get(VERIFY_KEY_HASH_PARAM);

	if (existingPrivateKey && existingPublicKey) {
		return {
			privateKey: await importSigningPrivateKey(existingPrivateKey),
			publicKey: await importSigningPublicKey(existingPublicKey)
		};
	}

	if (existingPublicKey) {
		return {
			privateKey: null,
			publicKey: await importSigningPublicKey(existingPublicKey)
		};
	}

	if (!allowGenerate) {
		return {
			privateKey: null,
			publicKey: null
		};
	}

	const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify'
	]);
	const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
	const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
	hashParams.set(WRITE_KEY_HASH_PARAM, encodeJson(privateJwk));
	hashParams.set(VERIFY_KEY_HASH_PARAM, encodeJson(publicJwk));
	url.hash = hashParams.toString();
	history.replaceState(history.state, '', url);

	return {
		privateKey: keyPair.privateKey,
		publicKey: keyPair.publicKey
	};
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

export async function signText(privateKey: CryptoKey, value: string): Promise<string> {
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		privateKey,
		toArrayBuffer(textToBytes(value))
	);
	return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyTextSignature(
	publicKey: CryptoKey,
	value: string,
	signature: string
): Promise<boolean> {
	try {
		return await crypto.subtle.verify(
			{ name: 'ECDSA', hash: 'SHA-256' },
			publicKey,
			toArrayBuffer(base64UrlToBytes(signature)),
			toArrayBuffer(textToBytes(value))
		);
	} catch {
		return false;
	}
}

async function importSigningPrivateKey(value: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'jwk',
		decodeJson<JsonWebKey>(value),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);
}

async function importSigningPublicKey(value: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'jwk',
		decodeJson<JsonWebKey>(value),
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify']
	);
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
