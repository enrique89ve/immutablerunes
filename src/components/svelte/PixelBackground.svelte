<script lang="ts">
	import gsap from 'gsap';

	interface Props {
		username?: string;
		density?: number;
	}

	let { username = '', density = 40 }: Props = $props();

	// Genera un seed basado en el username para animaciones consistentes por usuario
	function hashCode(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	// Colores basados en el tema: rojo, grises, blancos
	const colors = [
		'rgba(238, 52, 74, 0.8)',
		'rgba(238, 52, 74, 0.5)',
		'rgba(238, 52, 74, 0.3)',
		'rgba(255, 255, 255, 0.6)',
		'rgba(255, 255, 255, 0.3)',
		'rgba(255, 255, 255, 0.15)',
		'rgba(150, 150, 150, 0.4)',
		'rgba(100, 100, 100, 0.3)',
	];

	const seed = $derived(hashCode(username));

	// Generar datos de pixeles
	const pixels = $derived(
		Array.from({ length: density }, (_, i) => ({
			id: i,
			size: 4 + (((seed + i) % 5) * 2),
			color: colors[(seed + i) % colors.length],
			x: 60 + ((seed + i * 17) % 40),
			y: (seed + i * 23) % 100,
			delay: ((seed + i) % 50) / 10,
			duration: 3 + ((seed + i) % 40) / 10,
			targetOpacity: 0.3 + ((seed + i) % 7) / 10,
			floatY: -20 - ((seed + i) % 30),
			floatX: ((seed + i) % 2 === 0 ? 1 : -1) * (10 + ((seed + i) % 20)),
		}))
	);

	// Acción para animar cada pixel
	function animatePixel(node: HTMLElement, params: typeof pixels[number]) {
		const { delay, duration, targetOpacity, floatY, floatX } = params;

		// Animación de aparición
		gsap.to(node, {
			opacity: targetOpacity,
			duration: 1,
			delay: delay,
			ease: 'power2.out'
		});

		// Animación de flotación
		gsap.to(node, {
			y: floatY,
			x: floatX,
			duration: duration,
			delay: delay,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut'
		});

		// Parpadeo
		gsap.to(node, {
			opacity: targetOpacity * 0.3,
			duration: 1.5 + (params.id % 20) / 10,
			delay: delay + 1,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut'
		});

		return {
			destroy() {
				gsap.killTweensOf(node);
			}
		};
	}
</script>

<div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
	{#each pixels as pixel (pixel.id)}
		<div
			use:animatePixel={pixel}
			class="absolute opacity-0"
			style="
				width: {pixel.size}px;
				height: {pixel.size}px;
				background: {pixel.color};
				left: {pixel.x}%;
				top: {pixel.y}%;
			"
		></div>
	{/each}
</div>
