import type { Lang } from '@/i18n/config';

const LANG_STORAGE_KEY = 'preferred_lang';

function detectBrowserLang(): Lang {
	if (typeof window === 'undefined') return 'en';
	const browserLang = navigator?.language?.split('-')[0];
	return browserLang === 'es' ? 'es' : 'en';
}

function getStoredLang(): Lang | null {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(LANG_STORAGE_KEY);
	return stored === 'es' || stored === 'en' ? stored : null;
}

// Singleton reactive state
let currentLang = $state<Lang>('en');
let initialized = false;

export function initLanguage(): Lang {
	if (initialized) return currentLang;

	const stored = getStoredLang();
	currentLang = stored ?? detectBrowserLang();
	initialized = true;

	return currentLang;
}

export function getLanguage(): Lang {
	return currentLang;
}

export function setLanguage(lang: Lang): void {
	currentLang = lang;
	if (typeof window !== 'undefined') {
		localStorage.setItem(LANG_STORAGE_KEY, lang);
	}
}

export function getLocale(): string {
	return currentLang === 'es' ? 'es-ES' : 'en-US';
}
