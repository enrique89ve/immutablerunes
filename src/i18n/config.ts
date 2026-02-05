import en from './en.json';
import es from './es.json';

export const languages = {
	en: 'English',
	es: 'Español'
} as const;

export const defaultLang = 'en' as const;

export type Lang = keyof typeof languages;

export const translations: Record<Lang, typeof en> = { en, es };

export function getLangFromUrl(url: URL): Lang {
	const [, lang] = url.pathname.split('/');
	if (lang in languages) return lang as Lang;
	return defaultLang;
}

export function useTranslations(lang: Lang) {
	return function t(key: string): string {
		const keys = key.split('.');
		let value: unknown = translations[lang];

		for (const k of keys) {
			if (value && typeof value === 'object' && k in value) {
				value = (value as Record<string, unknown>)[k];
			} else {
				value = undefined;
				break;
			}
		}

		if (typeof value === 'string') return value;

		let fallback: unknown = translations[defaultLang];
		for (const k of keys) {
			if (fallback && typeof fallback === 'object' && k in fallback) {
				fallback = (fallback as Record<string, unknown>)[k];
			} else {
				return key;
			}
		}

		return typeof fallback === 'string' ? fallback : key;
	};
}
