const STORAGE_KEY = 'syncingsh_nickname';
const COLOR_KEY = 'syncingsh_color';
const CUSTOM_FLAG_KEY = 'syncingsh_nickname_custom';

function randomGuestName(): string {
	return `Guest${Math.floor(Math.random() * 10000)}`;
}

function randomColor(): string {
	return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

export function getNickname(): string {
	if (typeof localStorage === 'undefined') return randomGuestName();
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) return stored;
	const name = randomGuestName();
	localStorage.setItem(STORAGE_KEY, name);
	return name;
}

export function setNickname(name: string): void {
	if (typeof localStorage !== 'undefined') {
		const trimmed = name.trim();
		localStorage.setItem(STORAGE_KEY, trimmed || randomGuestName());
		localStorage.setItem(CUSTOM_FLAG_KEY, trimmed ? 'true' : 'false');
	}
}

export function hasCustomNickname(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(CUSTOM_FLAG_KEY) === 'true';
}

export function getUserColor(): string {
	if (typeof localStorage === 'undefined') return randomColor();
	const stored = localStorage.getItem(COLOR_KEY);
	if (stored) return stored;
	const color = randomColor();
	localStorage.setItem(COLOR_KEY, color);
	return color;
}
