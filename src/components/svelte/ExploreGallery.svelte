<script lang="ts">
	import type { ExploreImage } from '@/protocol';
	import ImageModal from './ImageModal.svelte';
	import ImageCard from './ImageCard.svelte';
	import { initLanguage, getLocale } from '@/lib/stores/language.svelte';
	import { useTranslations } from '@/i18n/config';

	const lang = initLanguage();
	const locale = getLocale();
	const t = useTranslations(lang);

	interface Props {
		images: ExploreImage[];
	}

	let { images }: Props = $props();

	let selectedImage: ExploreImage | null = $state(null);
	let viewMode: 'grid' | 'large' = $state('large');

	function openImage(image: ExploreImage) {
		selectedImage = image;
	}

	function closeModal() {
		selectedImage = null;
	}

	function formatRelativeTime(timestamp: string): string {
		const now = Date.now();
		const date = new Date(timestamp).getTime();
		const diff = now - date;

		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return lang === 'es' ? 'ahora' : 'now';
		if (minutes < 60) return `${minutes}m`;
		if (hours < 24) return `${hours}h`;
		if (days < 30) return `${days}d`;
		return new Date(timestamp).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
	}
</script>

{#if images.length > 0}
	<!-- View toggle -->
	<div class="flex justify-center mb-6">
		<div class="inline-flex bg-subtle border border-text/10 rounded-lg p-1">
			<button
				type="button"
				onclick={() => viewMode = 'large'}
				class="flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all {viewMode === 'large' ? 'bg-accent text-white' : 'text-text/60 hover:text-text'}"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2"/>
				</svg>
				{t('gallery.large')}
			</button>
			<button
				type="button"
				onclick={() => viewMode = 'grid'}
				class="flex items-center gap-2 px-4 py-2 rounded-md font-mono text-xs uppercase tracking-wider transition-all {viewMode === 'grid' ? 'bg-accent text-white' : 'text-text/60 hover:text-text'}"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="7" height="7"/>
					<rect x="14" y="3" width="7" height="7"/>
					<rect x="3" y="14" width="7" height="7"/>
					<rect x="14" y="14" width="7" height="7"/>
				</svg>
				Grid
			</button>
		</div>
	</div>

	{#if viewMode === 'large'}
		<!-- Vista grande: responsive con altura uniforme -->
		<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto px-2">
			{#each images as image (image.imageId)}
				<div class="relative group">
					<!-- Card con altura responsive uniforme - sin overflow-hidden para permitir efecto 3D -->
					<div class="relative h-56 sm:h-64 md:h-72 lg:h-80">
						<ImageCard
							src={image.dataUrl}
							alt={`Pixel art by ${image.author}`}
							onclick={() => openImage(image)}
						/>
					</div>

					<!-- Info del autor - responsive -->
					<div class="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3">
						<img
							src={`https://images.hive.blog/u/${image.author}/avatar/small`}
							alt={image.author}
							class="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-accent/30 flex-shrink-0"
							onerror={(e) => e.currentTarget.style.display = 'none'}
						/>
						<div class="flex-1 min-w-0">
							<a href={`/@${image.author}`} class="font-mono text-xs sm:text-sm text-text hover:text-accent transition-colors block truncate">
								@{image.author}
							</a>
							<span class="font-mono text-[10px] text-text/50">
								{formatRelativeTime(image.timestamp)} · {image.width}×{image.height}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Vista grid: más compacta -->
		<div class="flex flex-wrap justify-center gap-4 px-2">
			{#each images as image (image.imageId)}
				<div class="relative group w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.75rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(20%-0.8rem)] xl:w-[calc(16.666%-0.85rem)] max-w-[180px]">
					<div class="aspect-square">
						<ImageCard
							src={image.dataUrl}
							alt={`Pixel art by ${image.author}`}
							onclick={() => openImage(image)}
						/>
					</div>

					<!-- Info overlay -->
					<div class="absolute inset-x-0 -bottom-1 translate-y-full opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-30 pointer-events-none">
						<div class="bg-bg/95 backdrop-blur-sm border border-text/10 rounded-lg p-2 mt-2 shadow-lg">
							<div class="flex items-center gap-2">
								<img
									src={`https://images.hive.blog/u/${image.author}/avatar/small`}
									alt={image.author}
									class="w-5 h-5 rounded-full border border-accent/50"
									onerror={(e) => e.currentTarget.style.display = 'none'}
								/>
								<span class="font-mono text-xs text-text truncate flex-1">
									@{image.author}
								</span>
								<span class="font-mono text-[10px] text-text/50">
									{formatRelativeTime(image.timestamp)}
								</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
{:else}
	<div class="flex min-h-[400px] flex-col items-center justify-center border border-dashed border-text/20 rounded-lg bg-subtle/30">
		<!-- Empty state icon -->
		<div class="mb-6 relative">
			<div class="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
				<svg class="w-10 h-10 text-accent/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
					<circle cx="8.5" cy="8.5" r="1.5"/>
					<polyline points="21 15 16 10 5 21"/>
				</svg>
			</div>
		</div>

		<p class="font-mono text-sm text-text/60 mb-6 text-center">{t('explore.empty')}</p>

		<!-- CTA Button styled like Hero -->
		<a
			href="/upload"
			class="group bg-accent relative overflow-hidden px-8 py-4 font-mono text-sm tracking-wider text-white uppercase transition-transform hover:scale-105 flex items-center gap-3 shadow-[0_0_30px_rgba(238,52,74,0.3)]"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
				<polyline points="17 8 12 3 7 8"/>
				<line x1="12" y1="3" x2="12" y2="15"/>
			</svg>
			{t('explore.uploadCta')}
		</a>
	</div>
{/if}

<!-- Modal -->
<ImageModal image={selectedImage} onclose={closeModal} />
