<script lang="ts">
	import { KeychainSDK, KeychainKeyTypes } from 'keychain-sdk';
	import type { SignBuffer } from 'keychain-sdk';
	import { AUTH_STORAGE_KEY } from '@/lib/constants';
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

	let { isOpen = $bindable(false), onSuccess }: { isOpen: boolean; onSuccess?: (username: string) => void } = $props();

	let username = $state('');
	let isLoading = $state(false);
	let error = $state('');

	// Generate pixel pattern based on username - changes on each keystroke
	const GRID_SIZE = 5;
	const TOTAL_PIXELS = GRID_SIZE * GRID_SIZE;

	function hashString(str: string, seed: number): number {
		let hash = seed;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash;
		}
		return Math.abs(hash);
	}

	const pixelStates = $derived.by(() => {
		const states: boolean[] = [];
		// Use username length as additional entropy for variation
		const input = username + username.length;

		for (let i = 0; i < TOTAL_PIXELS; i++) {
			const hash = hashString(input, i * 31);
			states.push(hash % 3 !== 0); // ~66% chance of being active
		}
		return states;
	});

	const pixelDelays = $derived.by(() => {
		const delays: number[] = [];
		for (let i = 0; i < TOTAL_PIXELS; i++) {
			delays.push((hashString(username + i, 7) % 8) * 0.05);
		}
		return delays;
	});

	async function handleLogin() {
		if (!username.trim()) {
			error = t('login.errors.loginFailed');
			return;
		}

		isLoading = true;
		error = '';

		try {
			const keychain = new KeychainSDK(window);

			if (!(await keychain.isKeychainInstalled())) {
				throw new Error(t('login.errors.keychainNotFound'));
			}

			const signBufferData: SignBuffer = {
				username: username.trim().toLowerCase(),
				message: 'Login to Immutable Runes',
				method: KeychainKeyTypes.posting,
				title: t('login.title')
			};

			const response = await keychain.signBuffer(signBufferData);

			if (response.success && response.data?.username) {
				const loggedUsername = response.data.username;
				localStorage.setItem(AUTH_STORAGE_KEY, loggedUsername);
				isOpen = false;
				onSuccess?.(loggedUsername);
			} else {
				throw new Error(response.message || t('login.errors.userCancelled'));
			}
		} catch (err) {
			error = err instanceof Error ? err.message : t('login.errors.loginFailed');
		} finally {
			isLoading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !isLoading) {
			handleLogin();
		}
		if (event.key === 'Escape') {
			isOpen = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			isOpen = false;
		}
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="login-title"
		tabindex="-1"
	>
		<div class="relative w-full max-w-md mx-4 border-2 border-accent/30 bg-bg-elevated p-8 rounded-lg shadow-[0_0_60px_rgba(238,52,74,0.2)]">
			<!-- Corner decorations -->
			<div class="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-accent/50"></div>
			<div class="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-accent/50"></div>
			<div class="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-accent/50"></div>
			<div class="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-accent/50"></div>

			<!-- Close button -->
			<button
				onclick={() => isOpen = false}
				class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/50 transition-colors hover:text-white hover:bg-white/10 rounded"
				aria-label={t('common.close')}
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>

			<!-- Header -->
			<div class="mb-6 text-center">
				<!-- Hive Logo -->
				<div class="flex justify-center mb-4">
					<div class="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center border border-accent/30">
						<svg class="w-6 h-6 text-accent" viewBox="0 0 640 640" fill="currentColor">
							<path d="M324.4 318.9L195.5 97.1C195.3 96.8 195 96.5 194.7 96.3C194.4 96.1 194 96 193.6 96C193.2 96 192.8 96.1 192.5 96.3C192.2 96.5 191.9 96.8 191.7 97.1L64.3 318.9C64.1 319.2 64 319.6 64 320C64 320.4 64.1 320.8 64.3 321.1L193.1 542.9C193.3 543.2 193.6 543.5 193.9 543.7C194.2 543.9 194.6 544 195 544C195.4 544 195.8 543.9 196.1 543.7C196.4 543.5 196.7 543.2 196.9 542.9L324.4 321.1C324.6 320.8 324.7 320.4 324.7 320C324.7 319.6 324.6 319.2 324.4 318.9zM363.5 293.2C363.7 293.5 364 293.8 364.3 294C364.6 294.2 365 294.3 365.4 294.3L431.9 294.3C432.3 294.3 432.7 294.2 433 294C433.3 293.8 433.6 293.5 433.8 293.2C434 292.9 434.1 292.5 434.1 292.1C434.1 291.7 434 291.3 433.8 291L323.1 97.1C322.9 96.8 322.6 96.5 322.3 96.3C322 96.1 321.6 96 321.2 96L254.7 96C254.3 96 253.9 96.1 253.6 96.3C253.3 96.5 253 96.8 252.8 97.1C252.6 97.4 252.5 97.8 252.5 98.2C252.5 98.6 252.6 99 252.8 99.3L363.4 293.2zM575.8 318.9L448.9 97.1C448.7 96.8 448.4 96.5 448.1 96.3C447.8 96.1 447.4 96 447 96L380.4 96C380 96 379.6 96.1 379.3 96.3C379 96.5 378.7 96.8 378.5 97.1C378.3 97.4 378.2 97.8 378.2 98.2C378.2 98.6 378.3 99 378.5 99.3L504.7 320L378.5 540.7C378.3 541 378.2 541.4 378.2 541.8C378.2 542.2 378.3 542.6 378.5 542.9C378.7 543.2 379 543.5 379.3 543.7C379.6 543.9 380 544 380.4 544L447 544C447.4 544 447.8 543.9 448.1 543.7C448.4 543.5 448.7 543.2 448.9 542.9L575.7 321.1C575.9 320.8 576 320.4 576 320C576 319.6 575.9 319.2 575.7 318.9zM430 348.9L363.5 348.9C363.1 348.9 362.7 349 362.4 349.2C362.1 349.4 361.8 349.7 361.6 350L252.8 540.7C252.6 541 252.5 541.4 252.5 541.8C252.5 542.2 252.6 542.6 252.8 542.9C253 543.2 253.3 543.5 253.6 543.7C253.9 543.9 254.3 544 254.7 544L321.2 544C321.6 544 322 543.9 322.3 543.7C322.6 543.5 322.9 543.2 323.1 542.9L431.9 352.3C432.1 352 432.2 351.6 432.2 351.2C432.2 350.8 432.1 350.4 431.9 350.1C431.7 349.8 431.4 349.5 431.1 349.3C430.8 349.1 430.4 349 430 349z"/>
						</svg>
					</div>
				</div>
				<h2 id="login-title" class="font-mono text-xl font-bold uppercase tracking-wider text-white">
					{t('login.title')}
				</h2>
				<p class="mt-2 text-sm text-white/60">
					{t('login.subtitle')}
				</p>
			</div>

			<!-- Pixel avatar grid -->
			<div class="mb-6 flex justify-center">
				<div class="relative h-20 w-20 border-2 border-white/20 bg-black/50 p-1">
					<div class="grid grid-cols-5 gap-[2px] h-full w-full">
						{#each pixelStates as isActive, i (i)}
							<div
								class="transition-all duration-300 ease-out {isActive ? 'bg-accent scale-100' : 'bg-white/10 scale-75'}"
								style="transition-delay: {pixelDelays[i]}s"
							></div>
						{/each}
					</div>
					<!-- Glow effect when typing -->
					{#if username}
						<div class="absolute -inset-2 bg-accent/20 blur-xl -z-10 animate-pulse"></div>
					{/if}
				</div>
			</div>

			<!-- Username input -->
			<div class="mb-4">
				<label for="username" class="mb-2 block font-mono text-xs uppercase tracking-wider text-white/60">
					{t('login.usernamePlaceholder')}
				</label>
				<div class="flex items-center border-2 border-white/20 bg-white/5 rounded focus-within:border-accent/50 transition-colors">
					<span class="px-3 font-mono text-white/40">@</span>
					<input
						id="username"
						type="text"
						bind:value={username}
						placeholder={t('login.usernamePlaceholder')}
						disabled={isLoading}
						class="w-full bg-transparent px-3 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none disabled:opacity-50"
					/>
				</div>
			</div>

			<!-- Error message -->
			{#if error}
				<div class="mb-4 border border-red-500/50 bg-red-500/10 p-3 rounded">
					<p class="font-mono text-xs text-red-400">{error}</p>
				</div>
			{/if}

			<!-- Login button -->
			<button
				onclick={handleLogin}
				disabled={isLoading || !username.trim()}
				class="w-full bg-accent py-3 font-mono text-sm uppercase tracking-wider text-white rounded transition-all hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(238,52,74,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
			>
				{#if isLoading}
					<span class="flex items-center justify-center gap-2">
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						{t('login.connecting')}
					</span>
				{:else}
					{t('login.connectButton')}
				{/if}
			</button>

			<!-- Help text -->
			<p class="mt-4 text-center font-mono text-xs text-white/40">
				{t('login.keychainRequired')} <a href="https://hive-keychain.com" target="_blank" rel="noopener" class="text-accent hover:underline">{t('login.installKeychain')}</a>
			</p>
		</div>
	</div>
{/if}
