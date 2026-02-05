import { AUTH_STORAGE_KEY } from './constants';

export function getLoggedUser(): string | null {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setLoggedUser(username: string): void {
	localStorage.setItem(AUTH_STORAGE_KEY, username);
}

export function logout(): void {
	localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAvatarUrl(username: string): string {
	return `https://images.hive.blog/u/${username}/avatar`;
}
