import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode } from './roomCode';

describe('generateRoomCode', () => {
	it('should generate a 7 character code', () => {
		const code = generateRoomCode();
		expect(code).toHaveLength(7);
	});

	it('should only contain allowed characters (lowercase + digits, no ambiguous)', () => {
		const allowed = /^[abcdefghjkmnpqrstuvwxyz23456789]+$/;
		for (let i = 0; i < 50; i++) {
			const code = generateRoomCode();
			expect(code).toMatch(allowed);
		}
	});

	it('should generate unique codes', () => {
		const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));
		expect(codes.size).toBeGreaterThan(90);
	});
});

describe('isValidRoomCode', () => {
	it('should accept valid codes (2-20 lowercase alphanumeric)', () => {
		expect(isValidRoomCode('ab')).toBe(true);
		expect(isValidRoomCode('abcd')).toBe(true);
		expect(isValidRoomCode('abc1234')).toBe(true);
		expect(isValidRoomCode('abcdefghijkl')).toBe(true);
		expect(isValidRoomCode('godfield')).toBe(true);
		expect(isValidRoomCode('abcdefghijklmnopqrst')).toBe(true); // 20 chars
	});

	it('should reject too short codes', () => {
		expect(isValidRoomCode('a')).toBe(false);
		expect(isValidRoomCode('')).toBe(false);
	});

	it('should reject too long codes', () => {
		expect(isValidRoomCode('abcdefghijklmnopqrstu')).toBe(false); // 21 chars
	});

	it('should reject uppercase letters', () => {
		expect(isValidRoomCode('ABCDEFG')).toBe(false);
		expect(isValidRoomCode('Abcdefg')).toBe(false);
	});

	it('should reject special characters', () => {
		expect(isValidRoomCode('abc-def')).toBe(false);
		expect(isValidRoomCode('abc def')).toBe(false);
		expect(isValidRoomCode('abc_def')).toBe(false);
	});
});
