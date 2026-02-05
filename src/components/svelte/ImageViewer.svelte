<script lang="ts">
	import { getImageByTxidClient, type TransactionImage } from '@/protocol/client-reader';
	import { initLanguage } from '@/lib/stores/language.svelte';
	import { useTranslations } from '@/i18n/config';

	const lang = initLanguage();
	const t = useTranslations(lang);

	interface Props {
		txid: string;
	}

	let { txid }: Props = $props();

	type LoadState =
		| { status: 'loading' }
		| { status: 'success'; image: TransactionImage }
		| { status: 'error'; message: string };

	let state: LoadState = $state({ status: 'loading' });

	function getDisplayDimensions(width: number, height: number): { displayWidth: number; displayHeight: number } {
		const maxDisplaySize = 400;
		const maxDimension = Math.max(width, height);
		const scale = Math.min(maxDisplaySize / maxDimension, 6);

		return {
			displayWidth: Math.round(width * scale),
			displayHeight: Math.round(height * scale)
		};
	}

	async function loadImage() {
		state = { status: 'loading' };

		const result = await getImageByTxidClient(txid);

		if (result.success) {
			state = { status: 'success', image: result.image };
		} else {
			state = { status: 'error', message: result.error };
		}
	}

	$effect(() => {
		loadImage();
	});

	const displayDims = $derived(
		state.status === 'success'
			? getDisplayDimensions(state.image.width, state.image.height)
			: { displayWidth: 0, displayHeight: 0 }
	);
</script>

<main class="min-h-screen bg-bg text-text">
	<div class="mx-auto max-w-4xl px-4 py-8">
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
				<p class="mt-2 font-mono text-[10px] text-text/30 break-all max-w-xs text-center">{txid}</p>
			</div>
		{:else if state.status === 'success'}
			{@const image = state.image}
			<div class="space-y-6">
				<!-- Image Container -->
				<div class="flex justify-center">
					<div class="relative bg-bg-surface rounded-lg p-6 sm:p-8 border border-text/10 transition-all duration-300 hover:border-accent/30 hover:shadow-[0_0_60px_rgba(238,52,74,0.15)]">
						<!-- Scanline overlay -->
						<div class="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)] rounded-lg"></div>

						<!-- Corner decorations -->
						<div class="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-accent/40"></div>
						<div class="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-accent/40"></div>
						<div class="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-accent/40"></div>
						<div class="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-accent/40"></div>

						<!-- Image wrapper -->
						<div
							class="relative transition-transform duration-300 hover:scale-105"
							style="width: {displayDims.displayWidth}px; height: {displayDims.displayHeight}px;"
						>
							<img
								src={image.dataUrl}
								alt="Pixel art de @{image.author}"
								width={displayDims.displayWidth}
								height={displayDims.displayHeight}
								class="pixelated block border-2 border-text/20 shadow-[0_0_40px_rgba(238,52,74,0.15)] transition-all duration-300 hover:border-accent/50 hover:shadow-[0_0_50px_rgba(238,52,74,0.25)]"
							/>
						</div>
					</div>
				</div>

				<!-- Metadata -->
				<div class="space-y-4">
					<!-- Author -->
					<div class="flex items-center justify-center gap-3">
						<img
							src="https://images.hive.blog/u/{image.author}/avatar/small"
							alt={image.author}
							class="w-8 h-8 rounded-full border-2 border-accent/30"
							onerror={(e) => e.currentTarget.style.display = 'none'}
						/>
						<a
							href="/@{image.author}"
							class="font-mono text-accent hover:underline"
						>
							@{image.author}
						</a>
					</div>

					<!-- Details Grid -->
					<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
						<div class="bg-subtle/50 rounded-lg p-3 border border-text/5">
							<div class="text-text/40 font-mono text-[10px] uppercase tracking-wider mb-1">{t('imageViewer.dimensions')}</div>
							<div class="font-mono text-sm text-text">{image.width}x{image.height}</div>
						</div>
						<div class="bg-subtle/50 rounded-lg p-3 border border-text/5">
							<div class="text-text/40 font-mono text-[10px] uppercase tracking-wider mb-1">{t('imageViewer.block')}</div>
							<div class="font-mono text-sm text-text">{image.blockNumber?.toLocaleString() ?? '-'}</div>
						</div>
						<div class="bg-subtle/50 rounded-lg p-3 border border-text/5 col-span-2 sm:col-span-1">
							<div class="text-text/40 font-mono text-[10px] uppercase tracking-wider mb-1">{t('upload.preview.transparency')}</div>
							<div class="font-mono text-sm text-text">{image.hasTransparency ? t('upload.preview.yes') : t('upload.preview.no')}</div>
						</div>
					</div>

					<!-- Transaction ID -->
					<div class="bg-subtle/30 rounded-lg p-4 border border-text/10">
						<div class="text-text/40 font-mono text-[10px] uppercase tracking-wider mb-2">Transaction ID</div>
						<code class="font-mono text-xs text-text/70 break-all">{txid}</code>
					</div>

					<!-- Actions -->
					<div class="flex flex-col sm:flex-row justify-center gap-3">
						<a
							href={image.dataUrl}
							download="{image.imageId}.webp"
							class="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white font-mono text-xs uppercase tracking-wider rounded hover:bg-accent/90 transition-colors"
						>
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="7 10 12 15 17 10"></polyline>
								<line x1="12" y1="15" x2="12" y2="3"></line>
							</svg>
							{t('imageViewer.download')}
						</a>
						<a
							href="https://hivehub.dev/tx/{txid}"
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center justify-center gap-2 px-5 py-3 border border-text/20 text-text/70 font-mono text-xs uppercase tracking-wider rounded hover:border-accent hover:text-accent transition-colors"
						>
							<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
								<polyline points="15 3 21 3 21 9"></polyline>
								<line x1="10" y1="14" x2="21" y2="3"></line>
							</svg>
							Ver en explorador
						</a>
					</div>
				</div>
			</div>
		{:else}
			<!-- Error state -->
			<div class="text-center py-16">
				<div class="w-20 h-20 rounded-full bg-text/5 flex items-center justify-center mx-auto mb-6">
					<svg class="w-10 h-10 text-text/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="11" cy="11" r="8"></circle>
						<path d="M21 21l-4.35-4.35"></path>
						<path d="M11 8v6M8 11h6"></path>
					</svg>
				</div>
				<h1 class="font-mono text-xl sm:text-2xl mb-3 text-text">Imagen no encontrada</h1>
				<p class="text-text/50 font-mono text-sm mb-6 max-w-md mx-auto">{state.message}</p>
				<a
					href="/explore"
					class="inline-flex items-center gap-2 px-5 py-3 bg-subtle text-text font-mono text-xs uppercase tracking-wider rounded hover:bg-text/10 transition-colors"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
						<circle cx="8.5" cy="8.5" r="1.5"></circle>
						<polyline points="21 15 16 10 5 21"></polyline>
					</svg>
					Explorar galeria
				</a>
			</div>
		{/if}
	</div>
</main>

