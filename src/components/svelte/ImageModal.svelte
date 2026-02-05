<script lang="ts">
	import type { ExploreImage } from '@/protocol';

	interface Props {
		image: ExploreImage | null;
		onclose: () => void;
	}

	let { image, onclose }: Props = $props();

	// Calcular dimensiones escaladas manteniendo aspect ratio
	const scaledDimensions = $derived(() => {
		if (!image) return { width: 0, height: 0, scale: 1 };

		const maxWidth = Math.min(500, window?.innerWidth * 0.8 || 500);
		const maxHeight = Math.min(400, window?.innerHeight * 0.5 || 400);

		const scaleX = maxWidth / image.width;
		const scaleY = maxHeight / image.height;
		const scale = Math.min(scaleX, scaleY, 6); // Máximo 6x

		return {
			width: Math.round(image.width * scale),
			height: Math.round(image.height * scale),
			scale
		};
	});

	function formatDate(timestamp: string): string {
		return new Date(timestamp).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if image}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
		onclick={handleBackdropClick}
	>
		<div class="relative max-w-2xl w-full bg-bg border border-text/10 rounded-lg overflow-hidden animate-in">
			<!-- Close button -->
			<button
				onclick={onclose}
				class="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-bg/80 text-text/70 hover:text-text hover:bg-bg transition-colors font-mono"
				aria-label="Cerrar"
			>
				×
			</button>

			<!-- Image container con aspect ratio preservado -->
			<div class="flex justify-center items-center bg-bg-elevated p-6 sm:p-8 min-h-[200px]">
				<!-- Scanlines overlay -->
				<div class="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)] pointer-events-none"></div>

				<div
					class="relative border-2 border-text/20 shadow-[0_0_40px_rgba(238,52,74,0.2)]"
					style="width: {scaledDimensions().width}px; height: {scaledDimensions().height}px;"
				>
					<img
						src={image.dataUrl}
						alt={`Pixel art by @${image.author}`}
						width={scaledDimensions().width}
						height={scaledDimensions().height}
						class="pixelated w-full h-full object-contain"
					/>
				</div>
			</div>

			<!-- Info -->
			<div class="p-4 space-y-4">
				<!-- Author -->
				<div class="flex items-center justify-between">
					<a
						href={`/@${image.author}`}
						class="font-mono text-accent hover:underline"
					>
						@{image.author}
					</a>
					<span class="font-mono text-xs text-text/50">
						{image.width}×{image.height}
					</span>
				</div>

				<!-- Metadata grid -->
				<div class="grid grid-cols-2 gap-3 text-center">
					<div class="bg-subtle rounded p-2">
						<div class="font-mono text-[10px] uppercase tracking-wide text-text/50 mb-1">Fecha</div>
						<div class="font-mono text-xs text-text/80">{formatDate(image.timestamp)}</div>
					</div>
					<div class="bg-subtle rounded p-2">
						<div class="font-mono text-[10px] uppercase tracking-wide text-text/50 mb-1">Bloque</div>
						<div class="font-mono text-xs text-text/80">{image.blockNumber.toLocaleString()}</div>
					</div>
				</div>

				<!-- Actions -->
				<a
					href={image.dataUrl}
					download={`${image.imageId}.webp`}
					class="block w-full px-3 py-2 bg-accent text-white font-mono text-xs text-center uppercase tracking-wider rounded hover:bg-accent/90 transition-colors"
				>
					Descargar
				</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.animate-in {
		animation: modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
