const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LENGTH = 7;

export function generateRoomCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
	return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function isValidRoomCode(code: string): boolean {
	return /^[a-z0-9]{4,12}$/.test(code);
}
