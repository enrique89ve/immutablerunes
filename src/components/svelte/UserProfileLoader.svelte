<script lang="ts">
	import { getUserImagesClient, type StoredImage } from '@/protocol/client-reader';
	import UserGallery from './UserGallery.svelte';
	import PixelBackground from './PixelBackground.svelte';
	import en from '@/i18n/en.json';
	import es from '@/i18n/es.json';

	const translations = { en, es } as const;
	type Lang = keyof typeof translations;

	// Language detection - runs once on client, defaults to 'en' on SSR
	const lang: Lang = typeof window !== 'undefined'
		? (navigator?.language?.split('-')[0] === 'es' ? 'es' : 'en')
		: 'en';

	function t(key: string): string {
		const keys = key.split('.');
		let value: unknown = translations[lang];
		for (const k of keys) {
			if (value && typeof value === 'object' && k in value) {
				value = (value as Record<string, unknown>)[k];
			} else {
				return key;
			}
		}
		return typeof value === 'string' ? value : key;
	}

	interface Props {
		username: string;
	}

	let { username }: Props = $props();

	type LoadState =
		| { status: 'loading' }
		| { status: 'success'; images: StoredImage[] }
		| { status: 'error'; message: string };

	let state: LoadState = $state({ status: 'loading' });

	async function loadImages() {
		state = { status: 'loading' };

		try {
			const images = await getUserImagesClient(username);
			state = { status: 'success', images };
		} catch (error) {
			state = {
				status: 'error',
				message: error instanceof Error ? error.message : t('common.error')
			};
		}
	}

	$effect(() => {
		loadImages();
	});

	const imageCount = $derived.by(() => {
		if (state.status === 'success') {
			return state.images.length;
		}
		return 0;
	});
</script>

<main class="relative min-h-screen bg-bg text-text overflow-hidden">
	<!-- Animated pixel background -->
	<PixelBackground {username} density={50} />

	<div class="relative mx-auto max-w-7xl px-4 py-8">
		<!-- Profile header -->
		<div class="mb-8 flex flex-col sm:flex-row items-center gap-6 p-6 bg-subtle/50 border border-text/10 rounded-lg">
			<!-- Avatar -->
			<div class="relative">
				<div class="h-24 w-24 rounded-full overflow-hidden border-2 border-accent/50 shadow-[0_0_20px_rgba(238,52,74,0.2)]">
					<img
						src="https://images.hive.blog/u/{username}/avatar"
						alt="Avatar de {username}"
						class="h-full w-full object-cover"
						onerror={(e) => {
							e.currentTarget.style.display = 'none';
							const fallback = e.currentTarget.nextElementSibling as HTMLElement;
							if (fallback) fallback.style.display = 'flex';
						}}
					/>
					<div class="h-full w-full bg-accent/20 items-center justify-center hidden">
						<span class="font-mono text-3xl text-accent font-bold">
							{username.charAt(0).toUpperCase()}
						</span>
					</div>
				</div>
				<!-- Online indicator -->
				<div class="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-bg"></div>
			</div>

			<!-- User info -->
			<div class="text-center sm:text-left flex-1">
				<h1 class="font-mono text-2xl sm:text-3xl font-bold text-text mb-2">@{username}</h1>
				<div class="flex items-center justify-center sm:justify-start gap-4">
					<!-- Image count badge -->
					<div class="flex items-center gap-2 px-3 py-1.5 bg-bg border border-text/20 rounded-full">
						<svg class="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
							<circle cx="8.5" cy="8.5" r="1.5"/>
							<polyline points="21 15 16 10 5 21"/>
						</svg>
						{#if state.status === 'loading'}
							<span class="font-mono text-sm text-text/50">...</span>
						{:else}
							<span class="font-mono text-sm text-text">
								{imageCount} {t('profile.images')}
							</span>
						{/if}
					</div>
					<!-- Hive link -->
					<a
						href="https://ecency.com/@{username}"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-1.5 px-3 py-1.5 text-text/50 hover:text-accent transition-colors font-mono text-xs"
					>
						<svg class="w-4 h-4" viewBox="0 0 640 640" fill="currentColor">
							<path d="M324.4 318.9L195.5 97.1C195.3 96.8 195 96.5 194.7 96.3C194.4 96.1 194 96 193.6 96C193.2 96 192.8 96.1 192.5 96.3C192.2 96.5 191.9 96.8 191.7 97.1L64.3 318.9C64.1 319.2 64 319.6 64 320C64 320.4 64.1 320.8 64.3 321.1L193.1 542.9C193.3 543.2 193.6 543.5 193.9 543.7C194.2 543.9 194.6 544 195 544C195.4 544 195.8 543.9 196.1 543.7C196.4 543.5 196.7 543.2 196.9 542.9L324.4 321.1C324.6 320.8 324.7 320.4 324.7 320C324.7 319.6 324.6 319.2 324.4 318.9zM363.5 293.2C363.7 293.5 364 293.8 364.3 294C364.6 294.2 365 294.3 365.4 294.3L431.9 294.3C432.3 294.3 432.7 294.2 433 294C433.3 293.8 433.6 293.5 433.8 293.2C434 292.9 434.1 292.5 434.1 292.1C434.1 291.7 434 291.3 433.8 291L323.1 97.1C322.9 96.8 322.6 96.5 322.3 96.3C322 96.1 321.6 96 321.2 96L254.7 96C254.3 96 253.9 96.1 253.6 96.3C253.3 96.5 253 96.8 252.8 97.1C252.6 97.4 252.5 97.8 252.5 98.2C252.5 98.6 252.6 99 252.8 99.3L363.4 293.2zM575.8 318.9L448.9 97.1C448.7 96.8 448.4 96.5 448.1 96.3C447.8 96.1 447.4 96 447 96L380.4 96C380 96 379.6 96.1 379.3 96.3C379 96.5 378.7 96.8 378.5 97.1C378.3 97.4 378.2 97.8 378.2 98.2C378.2 98.6 378.3 99 378.5 99.3L504.7 320L378.5 540.7C378.3 541 378.2 541.4 378.2 541.8C378.2 542.2 378.3 542.6 378.5 542.9C378.7 543.2 379 543.5 379.3 543.7C379.6 543.9 380 544 380.4 544L447 544C447.4 544 447.8 543.9 448.1 543.7C448.4 543.5 448.7 543.2 448.9 542.9L575.7 321.1C575.9 320.8 576 320.4 576 320C576 319.6 575.9 319.2 575.7 318.9zM430 348.9L363.5 348.9C363.1 348.9 362.7 349 362.4 349.2C362.1 349.4 361.8 349.7 361.6 350L252.8 540.7C252.6 541 252.5 541.4 252.5 541.8C252.5 542.2 252.6 542.6 252.8 542.9C253 543.2 253.3 543.5 253.6 543.7C253.9 543.9 254.3 544 254.7 544L321.2 544C321.6 544 322 543.9 322.3 543.7C322.6 543.5 322.9 543.2 323.1 542.9L431.9 352.3C432.1 352 432.2 351.6 432.2 351.2C432.2 350.8 432.1 350.4 431.9 350.1C431.7 349.8 431.4 349.5 431.1 349.3C430.8 349.1 430.4 349 430 349z"/>
						</svg>
						Ver en Hive
					</a>
				</div>
			</div>
		</div>

		{#if state.status === 'loading'}
			<!-- Loading state -->
			<div class="flex flex-col items-center justify-center min-h-[400px]">
				<div class="relative">
					<div class="w-16 h-16 border-2 border-accent/30 border-t-accent rounded-full animate-spin"></div>
					<div class="absolute inset-0 flex items-center justify-center">
						<svg class="w-6 h-6 text-accent/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
							<circle cx="8.5" cy="8.5" r="1.5"/>
							<polyline points="21 15 16 10 5 21"/>
						</svg>
					</div>
				</div>
				<p class="mt-4 font-mono text-sm text-text/50">{t('common.loading')}</p>
			</div>
		{:else if state.status === 'error'}
			<div class="bg-accent/10 border border-accent/30 rounded-lg p-4 text-center">
				<p class="font-mono text-sm text-accent">{state.message}</p>
			</div>
		{:else}
			<UserGallery
				images={state.images}
				emptyMessage={t('profile.emptyOwn')}
			/>
		{/if}
	</div>
</main>
