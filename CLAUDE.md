# Immutable Runes

Plataforma para almacenar y visualizar Pixel Art de forma inmutable en la blockchain de Hive.

## Descripción del Proyecto

Permite subir imágenes optimizadas (hasta 18KB), fragmentarlas y almacenarlas en operaciones `custom_json` con id `pixel_image`. También visualiza imágenes existentes reconstruyéndolas desde la blockchain.

## Stack Tecnológico

- **Framework**: Astro 5
- **Componentes interactivos**: Svelte 5 (solo upload + preview)
- **Estilos**: Tailwind CSS v4
- **Blockchain**: @hiveio/wax
- **Wallet**: Hive Keychain (login + firma de transacciones)

## Rutas

| Ruta | Descripción | Tipo |
|------|-------------|------|
| `/` | Landing page con CTA para subir imagen | Estática |
| `/@[username]` | Grid con todas las imágenes del usuario | Dinámica SSR |
| `/explore` | Últimas 20 imágenes creadas globalmente | SSR |
| `/upload` | Página de subida (requiere auth) | Protegida |

## Arquitectura Híbrida

### TypeScript Puro
- Login con Hive Keychain
- Middleware de autenticación
- Estado de sesión (localStorage)
- Lectura de blockchain con wax

### Svelte 5 (client:load)
- `ImageUploader.svelte` - Selección y optimización de imagen
- `ImagePreview.svelte` - Preview de cómo queda en 18KB
- `UploadProgress.svelte` - Progreso de fragmentación y subida

## Sistema de Diseño

Inspirado en [grilledpixels.com](https://www.grilledpixels.com/) - minimalista, alto contraste.

### Paleta de Colores
```css
--color-bg: #000000;
--color-text: #ffffff;
--color-accent: #EE344A;
--color-muted: rgba(255, 255, 255, 0.6);
--color-subtle: rgba(255, 255, 255, 0.06);
```

### Tipografía
- **Headlines**: Font monospace, uppercase, tracking wide
- **Body**: Sans-serif limpio
- **UI/Labels**: Monospace pequeño

### Principios de Diseño
- Fondo negro puro, texto blanco
- Mucho espacio negativo
- Grid para mostrar imágenes pixel art
- Hover: `scale(1.05)` con transición suave
- Imágenes: `image-rendering: pixelated`

## Estructura del Proyecto

```
src/
├── components/
│   ├── astro/           # Componentes Astro (estáticos)
│   │   ├── Header.astro
│   │   ├── ImageGrid.astro
│   │   └── LoginButton.astro
│   └── svelte/          # Componentes Svelte (interactivos)
│       ├── ImageUploader.svelte
│       ├── ImagePreview.svelte
│       └── UploadProgress.svelte
├── layouts/
│   └── Layout.astro
├── pages/
│   ├── index.astro          # Landing
│   ├── explore.astro        # Explorar imágenes
│   ├── upload.astro         # Subir imagen (protegida)
│   └── @[username].astro    # Perfil de usuario
├── lib/
│   ├── hive.ts              # Conexión wax + queries
│   ├── auth.ts              # Login con Keychain
│   ├── fragments.ts         # Fragmentación de imágenes
│   ├── optimizer.ts         # Optimización a 18KB
│   └── constants.ts         # Magic strings centralizados
├── middleware/
│   └── auth.ts              # Protección de rutas
└── styles/
    └── global.css
```

## Autenticación con Hive Keychain

```typescript
// src/lib/auth.ts
interface AuthState {
	username: string | null;
	isLoggedIn: boolean;
}

async function loginWithKeychain(): Promise<string> {
	if (!window.hive_keychain) {
		throw new Error('Hive Keychain not installed');
	}

	return new Promise((resolve, reject) => {
		window.hive_keychain.requestHandshake(() => {
			// Solicitar firma para verificar identidad
			const message = `Login to Immutable Runes: ${Date.now()}`;
			window.hive_keychain.requestSignBuffer(
				null, // username (null = prompt user)
				message,
				'Posting',
				(response) => {
					if (response.success) {
						localStorage.setItem('hive_user', response.data.username);
						resolve(response.data.username);
					} else {
						reject(new Error(response.message));
					}
				}
			);
		});
	});
}

function getLoggedUser(): string | null {
	return localStorage.getItem('hive_user');
}

function logout(): void {
	localStorage.removeItem('hive_user');
}
```

## Flujo de Upload

1. Usuario hace click en "Upload" → verifica auth
2. Si no está logueado → muestra modal de login
3. Selecciona imagen → `ImageUploader.svelte`
4. Se procesa y optimiza a ≤18KB → `optimizer.ts`
5. Preview de resultado → `ImagePreview.svelte`
6. Usuario confirma → fragmentar imagen
7. Firmar transacciones con Keychain → `UploadProgress.svelte`
8. Mostrar resultado final

## Especificaciones de Fragmentación

```
Tamaño máximo por fragmento: ~8000 bytes
Fragmentos típicos: 2-3 por imagen de 18KB
Formato de datos: Base64
custom_json id: "pixel_image"
```

## Custom JSON Structure

```typescript
interface PixelImageFragment {
	imageId: string;          // UUID único
	fragmentIndex: number;    // 0, 1, 2...
	totalFragments: number;   // Total de fragmentos
	data: string;             // Base64 chunk
	mimeType: 'image/png' | 'image/webp';
	author: string;           // Username de Hive
	createdAt: number;        // Timestamp
}
```

## Uso de @hiveio/wax

```typescript
import { createHiveChain } from '@hiveio/wax';

const chain = await createHiveChain();

// Leer historial de cuenta
const history = await chain.api.account_history_api.get_account_history({
	account: 'enrique89',
	start: -1,
	limit: 1000,
	include_reversible: true,
	operation_filter_low: 18,
	operation_filter_high: 0
});

// Filtrar pixel_image
const pixelImages = history.history
	.filter(([, op]) => op.op[0] === 'custom_json' && op.op[1].id === 'pixel_image')
	.map(([, op]) => JSON.parse(op.op[1].json));
```

## Reconstrucción de Imagen

```typescript
function reconstructImage(fragments: PixelImageFragment[]): string {
	const sorted = fragments.sort((a, b) => a.fragmentIndex - b.fragmentIndex);
	const base64 = sorted.map(f => f.data).join('');
	const mimeType = sorted[0]?.mimeType ?? 'image/png';
	return `data:${mimeType};base64,${base64}`;
}
```

## Convenciones de Código

### Nombrado
- `camelCase` para funciones y variables
- `PascalCase` para componentes e interfaces
- Nombres descriptivos, evitar abreviaciones

### Funciones
- Máximo 20-30 líneas por función
- Propósito único por función
- Evitar Magic Strings (usar `src/lib/constants.ts`)

### Svelte 5
- Usar runes (`$state`, `$derived`, `$effect`)
- Preferir `onclick` sobre `on:click`
- Props con `let { prop } = $props()`
