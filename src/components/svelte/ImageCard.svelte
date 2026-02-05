<script lang="ts">
	import gsap from 'gsap';

	interface Props {
		src: string;
		alt: string;
		onclick: () => void;
	}

	let { src, alt, onclick }: Props = $props();

	let cardElement: HTMLButtonElement;
	let imageElement: HTMLImageElement;
	let pixelOverlay: HTMLCanvasElement;
	let isHovering = $state(false);

	// Configuración de efectos
	const TILT_MAX = 15; // Grados máximos de inclinación
	const SCALE_HOVER = 1.08; // Escala en hover
	const PERSPECTIVE = 800;
	const PIXEL_RADIUS = 60; // Radio del efecto pixelado
	const PIXEL_SIZE = 8; // Tamaño del pixel

	function handleMouseEnter() {
		isHovering = true;
		gsap.to(cardElement, {
			scale: SCALE_HOVER,
			boxShadow: '0 25px 50px rgba(238, 52, 74, 0.3), 0 0 0 1px rgba(238, 52, 74, 0.5)',
			duration: 0.3,
			ease: 'power2.out'
		});
	}

	function handleMouseLeave() {
		isHovering = false;
		gsap.to(cardElement, {
			rotateX: 0,
			rotateY: 0,
			scale: 1,
			boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
			duration: 0.5,
			ease: 'power2.out'
		});
		clearPixelOverlay();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!cardElement || !isHovering) return;

		const rect = cardElement.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		// Calcular posición relativa al centro (-1 a 1)
		const mouseX = (e.clientX - centerX) / (rect.width / 2);
		const mouseY = (e.clientY - centerY) / (rect.height / 2);

		// Aplicar rotación 3D (invertido para efecto natural)
		gsap.to(cardElement, {
			rotateY: mouseX * TILT_MAX,
			rotateX: -mouseY * TILT_MAX,
			duration: 0.3,
			ease: 'power2.out'
		});

		// Dibujar efecto pixelado en la posición del mouse
		drawPixelEffect(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
	}

	function drawPixelEffect(mouseX: number, mouseY: number, width: number, height: number) {
		if (!pixelOverlay || !imageElement) return;

		const ctx = pixelOverlay.getContext('2d', { willReadFrequently: true });
		if (!ctx) return;

		// Ajustar tamaño del canvas
		pixelOverlay.width = width;
		pixelOverlay.height = height;

		// Limpiar
		ctx.clearRect(0, 0, width, height);

		// Dibujar la imagen original primero (invisible, solo para sampling)
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = width;
		tempCanvas.height = height;
		const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
		if (!tempCtx) return;

		tempCtx.drawImage(imageElement, 0, 0, width, height);

		// Crear efecto pixelado circular alrededor del cursor
		for (let x = 0; x < width; x += PIXEL_SIZE) {
			for (let y = 0; y < height; y += PIXEL_SIZE) {
				const dx = x + PIXEL_SIZE / 2 - mouseX;
				const dy = y + PIXEL_SIZE / 2 - mouseY;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < PIXEL_RADIUS) {
					// Obtener color promedio del área
					const imageData = tempCtx.getImageData(x, y, PIXEL_SIZE, PIXEL_SIZE);
					const avgColor = getAverageColor(imageData.data);

					// Intensidad basada en distancia (más cerca = más pixelado)
					const intensity = 1 - (distance / PIXEL_RADIUS);

					ctx.fillStyle = `rgba(${avgColor.r}, ${avgColor.g}, ${avgColor.b}, ${intensity * 0.8})`;
					ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);

					// Agregar borde sutil para efecto "bloque"
					ctx.strokeStyle = `rgba(238, 52, 74, ${intensity * 0.3})`;
					ctx.lineWidth = 1;
					ctx.strokeRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
				}
			}
		}
	}

	function getAverageColor(data: Uint8ClampedArray): { r: number; g: number; b: number } {
		let r = 0, g = 0, b = 0, count = 0;
		for (let i = 0; i < data.length; i += 4) {
			r += data[i];
			g += data[i + 1];
			b += data[i + 2];
			count++;
		}
		return {
			r: Math.round(r / count),
			g: Math.round(g / count),
			b: Math.round(b / count)
		};
	}

	function clearPixelOverlay() {
		if (!pixelOverlay) return;
		const ctx = pixelOverlay.getContext('2d', { willReadFrequently: true });
		if (ctx) {
			ctx.clearRect(0, 0, pixelOverlay.width, pixelOverlay.height);
		}
	}

	// Action para configurar perspectiva
	function setupCard(node: HTMLButtonElement) {
		gsap.set(node, {
			transformPerspective: PERSPECTIVE,
			transformStyle: 'preserve-3d'
		});

		return {
			destroy() {
				gsap.killTweensOf(node);
			}
		};
	}
</script>

<button
	bind:this={cardElement}
	use:setupCard
	type="button"
	{onclick}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onmousemove={handleMouseMove}
	class="group relative w-full h-full overflow-hidden bg-subtle/50 border border-text/10 rounded-lg cursor-pointer will-change-transform"
	style="box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);"
>
	<!-- Fondo con gradiente sutil -->
	<div class="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>

	<!-- Scanline effect -->
	<div class="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)] pointer-events-none z-10"></div>

	<!-- Imagen principal -->
	<img
		bind:this={imageElement}
		{src}
		{alt}
		class="h-full w-full object-contain p-3 pixelated relative z-0"
		loading="lazy"
		crossorigin="anonymous"
	/>

	<!-- Overlay de pixelado dinámico -->
	<canvas
		bind:this={pixelOverlay}
		class="absolute inset-0 pointer-events-none z-20"
	></canvas>

	<!-- Borde brillante en hover -->
	<div class="absolute inset-0 rounded-lg border-2 border-accent/0 transition-all duration-300 group-hover:border-accent/50 pointer-events-none z-30"></div>

	<!-- Efecto de profundidad (esquinas) -->
	<div class="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-transparent transition-all duration-300 group-hover:border-accent/60 pointer-events-none z-30"></div>
	<div class="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-transparent transition-all duration-300 group-hover:border-accent/60 pointer-events-none z-30"></div>
	<div class="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-transparent transition-all duration-300 group-hover:border-accent/60 pointer-events-none z-30"></div>
	<div class="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-transparent transition-all duration-300 group-hover:border-accent/60 pointer-events-none z-30"></div>
</button>

