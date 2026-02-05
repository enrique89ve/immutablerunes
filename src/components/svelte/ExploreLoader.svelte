<script lang="ts">
	import { getExploreImagesClient, type ExploreImage } from '@/protocol/client-reader';
	import ExploreGallery from './ExploreGallery.svelte';
	import PixelBackground from './PixelBackground.svelte';
	import { initLanguage } from '@/lib/stores/language.svelte';
	import { useTranslations } from '@/i18n/config';

	const lang = initLanguage();
	const t = useTranslations(lang);

	type LoadState =
		| { status: 'loading' }
		| { status: 'success'; images: ExploreImage[] }
		| { status: 'error'; message: string };

	let state: LoadState = $state({ status: 'loading' });

	async function loadImages() {
		state = { status: 'loading' };

		try {
			const images = await getExploreImagesClient(30);
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
	<!-- Subtle pixel background -->
	<PixelBackground username="explore" density={30} />

	<div class="relative mx-auto max-w-7xl px-4 py-8">
		<!-- Gallery header -->
		<div class="mb-8 text-center">
			<div class="inline-flex items-center gap-3 mb-4">
				<div class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30">
					<svg class="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
						<circle cx="8.5" cy="8.5" r="1.5"/>
						<polyline points="21 15 16 10 5 21"/>
					</svg>
				</div>
				<h1 class="font-mono text-3xl sm:text-4xl font-bold text-text uppercase tracking-wide">
					{t('explore.title')}
				</h1>
			</div>
			<p class="font-mono text-sm text-text/60 mb-2">
				{t('explore.subtitle')}
			</p>
			<div class="inline-flex items-center gap-2 px-4 py-2 bg-subtle border border-text/10 rounded-full">
				<span class="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
				{#if state.status === 'loading'}
					<span class="font-mono text-sm text-text/50">{t('common.loading')}</span>
				{:else}
					<span class="font-mono text-sm text-text">
						{imageCount} {t('home.stats.images')} on-chain
					</span>
				{/if}
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
			<ExploreGallery images={state.images} />
		{/if}
	</div>
</main>
