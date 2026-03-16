import { describe, it, expect, beforeEach } from 'vitest';
import { getNickname, setNickname, getUserColor } from './nickname';

describe('getNickname', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should generate a Guest name on first call', () => {
		const name = getNickname();
		expect(name).toMatch(/^Guest\d+$/);
	});

	it('should persist and return the same name on subsequent calls', () => {
		const first = getNickname();
		const second = getNickname();
		expect(first).toBe(second);
	});
});

describe('setNickname', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should save and retrieve a custom nickname', () => {
		setNickname('TestUser');
		expect(getNickname()).toBe('TestUser');
	});

	it('should fallback to Guest name if empty string is set', () => {
		setNickname('');
		const name = getNickname();
		expect(name).toMatch(/^Guest\d+$/);
	});

	it('should trim whitespace-only input and fallback', () => {
		setNickname('   ');
		const name = getNickname();
		expect(name).toMatch(/^Guest\d+$/);
	});
});

describe('getUserColor', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should return an hsl color string', () => {
		const color = getUserColor();
		expect(color).toMatch(/^hsl\(\d+, 70%, 60%\)$/);
	});

	it('should persist and return the same color', () => {
		const first = getUserColor();
		const second = getUserColor();
		expect(first).toBe(second);
	});
});
