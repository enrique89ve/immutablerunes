<script lang="ts">
	import { AUTH_STORAGE_KEY } from '@/lib/constants';
	import LoginModal from './LoginModal.svelte';
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

	let username = $state<string | null>(null);
	let showLoginModal = $state(false);
	let showUserMenu = $state(false);

	const avatarUrl = $derived(
		username ? `https://images.hive.blog/u/${username}/avatar` : ''
	);

	$effect(() => {
		username = localStorage.getItem(AUTH_STORAGE_KEY);
	});

	function handleLoginSuccess(loggedUsername: string) {
		username = loggedUsername;
		showUserMenu = false;
	}

	function handleLogout() {
		localStorage.removeItem(AUTH_STORAGE_KEY);
		username = null;
		showUserMenu = false;
	}

	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('#user-menu-container')) {
			showUserMenu = false;
		}
	}

	$effect(() => {
		if (showUserMenu && typeof window !== 'undefined') {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});
</script>

<header class="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
	<div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
		<!-- Logo -->
		<a href="/" class="group flex items-center gap-3">
			<div class="relative flex h-8 w-8 items-center justify-center">
				<div class="absolute inset-0 bg-accent opacity-20 blur-md transition-opacity group-hover:opacity-40"></div>
				<!-- Pixelated Diamond - 7x8 grid (slightly narrow) -->
				<svg class="relative h-7 w-7 text-accent" viewBox="0 0 7 8" fill="currentColor">
					<rect x="3" y="0" width="1" height="1" />
					<rect x="2" y="1" width="3" height="1" />
					<rect x="1" y="2" width="5" height="1" />
					<rect x="0" y="3" width="7" height="1" />
					<rect x="0" y="4" width="7" height="1" />
					<rect x="1" y="5" width="5" height="1" />
					<rect x="2" y="6" width="3" height="1" />
					<rect x="3" y="7" width="1" height="1" />
				</svg>
			</div>
			<span class="font-mono text-sm font-semibold uppercase tracking-widest">
				Immutable<span class="text-accent">Runes</span>
			</span>
		</a>

		<!-- Navigation -->
		<nav class="hidden items-center gap-8 md:flex">
			<a
				href="/explore"
				class="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				{t('nav.explore')}
			</a>
			<a
				href="/upload"
				class="font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				{t('nav.upload')}
			</a>
		</nav>

		<!-- Auth -->
		<div class="flex items-center gap-4">
			{#if username}
				<!-- User menu -->
				<div id="user-menu-container" class="relative">
					<button
						onclick={toggleUserMenu}
						class="flex items-center gap-2 group"
					>
						<!-- Avatar with accent glow -->
						<div class="relative">
							<div class="h-10 w-10 rounded-full overflow-hidden border-2 border-accent/50 shadow-[0_0_15px_rgba(238,52,74,0.3)] transition-all group-hover:border-accent group-hover:shadow-[0_0_20px_rgba(238,52,74,0.5)]">
								<img
									src={avatarUrl}
									alt={username}
									class="h-full w-full object-cover"
									onerror={(e) => {
										(e.currentTarget as HTMLImageElement).style.display = 'none';
									}}
								/>
							</div>
							<!-- Online indicator -->
							<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
						</div>
						<div class="hidden sm:flex flex-col items-start">
							<span class="font-mono text-sm text-foreground">
								@{username}
							</span>
							<span class="font-mono text-[10px] text-accent">
								{t('common.connected')}
							</span>
						</div>
						<svg class="h-4 w-4 text-muted-foreground transition-transform duration-200" class:rotate-180={showUserMenu} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>

					{#if showUserMenu}
						<div class="absolute right-0 mt-2 w-56 border border-accent/20 bg-background/95 backdrop-blur-sm py-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
							<!-- User info header -->
							<div class="px-4 py-3 border-b border-border mb-2">
								<div class="flex items-center gap-3">
									<div class="h-12 w-12 rounded-full overflow-hidden border border-accent/30">
										<img src={avatarUrl} alt={username} class="h-full w-full object-cover" />
									</div>
									<div>
										<p class="font-mono text-sm font-bold text-foreground">@{username}</p>
										<a
											href={`https://ecency.com/@${username}`}
											target="_blank"
											rel="noopener noreferrer"
											class="font-mono text-[10px] text-accent hover:underline"
										>
											{t('nav.viewOnHive')}
										</a>
									</div>
								</div>
							</div>

							<a
								href={`/@${username}`}
								class="flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
							>
								<svg class="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
									<circle cx="8.5" cy="8.5" r="1.5"/>
									<polyline points="21 15 16 10 5 21"/>
								</svg>
								{t('nav.myGallery')}
							</a>
							<a
								href="/upload"
								class="flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
							>
								<svg class="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
									<polyline points="17 8 12 3 7 8"/>
									<line x1="12" y1="3" x2="12" y2="15"/>
								</svg>
								{t('nav.uploadImage')}
							</a>
							<hr class="my-2 border-border" />
							<button
								onclick={handleLogout}
								class="flex w-full items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" y1="12" x2="9" y2="12" />
								</svg>
								{t('common.logout')}
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Login button -->
				<button
					onclick={() => showLoginModal = true}
					class="group relative overflow-hidden border border-accent bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition-all hover:bg-accent hover:text-white"
				>
					<span class="relative z-10 flex items-center gap-2">
						<svg class="h-4 w-4" viewBox="0 0 640 640" fill="currentColor">
							<path d="M324.4 318.9L195.5 97.1C195.3 96.8 195 96.5 194.7 96.3C194.4 96.1 194 96 193.6 96C193.2 96 192.8 96.1 192.5 96.3C192.2 96.5 191.9 96.8 191.7 97.1L64.3 318.9C64.1 319.2 64 319.6 64 320C64 320.4 64.1 320.8 64.3 321.1L193.1 542.9C193.3 543.2 193.6 543.5 193.9 543.7C194.2 543.9 194.6 544 195 544C195.4 544 195.8 543.9 196.1 543.7C196.4 543.5 196.7 543.2 196.9 542.9L324.4 321.1C324.6 320.8 324.7 320.4 324.7 320C324.7 319.6 324.6 319.2 324.4 318.9zM363.5 293.2C363.7 293.5 364 293.8 364.3 294C364.6 294.2 365 294.3 365.4 294.3L431.9 294.3C432.3 294.3 432.7 294.2 433 294C433.3 293.8 433.6 293.5 433.8 293.2C434 292.9 434.1 292.5 434.1 292.1C434.1 291.7 434 291.3 433.8 291L323.1 97.1C322.9 96.8 322.6 96.5 322.3 96.3C322 96.1 321.6 96 321.2 96L254.7 96C254.3 96 253.9 96.1 253.6 96.3C253.3 96.5 253 96.8 252.8 97.1C252.6 97.4 252.5 97.8 252.5 98.2C252.5 98.6 252.6 99 252.8 99.3L363.4 293.2zM575.8 318.9L448.9 97.1C448.7 96.8 448.4 96.5 448.1 96.3C447.8 96.1 447.4 96 447 96L380.4 96C380 96 379.6 96.1 379.3 96.3C379 96.5 378.7 96.8 378.5 97.1C378.3 97.4 378.2 97.8 378.2 98.2C378.2 98.6 378.3 99 378.5 99.3L504.7 320L378.5 540.7C378.3 541 378.2 541.4 378.2 541.8C378.2 542.2 378.3 542.6 378.5 542.9C378.7 543.2 379 543.5 379.3 543.7C379.6 543.9 380 544 380.4 544L447 544C447.4 544 447.8 543.9 448.1 543.7C448.4 543.5 448.7 543.2 448.9 542.9L575.7 321.1C575.9 320.8 576 320.4 576 320C576 319.6 575.9 319.2 575.7 318.9zM430 348.9L363.5 348.9C363.1 348.9 362.7 349 362.4 349.2C362.1 349.4 361.8 349.7 361.6 350L252.8 540.7C252.6 541 252.5 541.4 252.5 541.8C252.5 542.2 252.6 542.6 252.8 542.9C253 543.2 253.3 543.5 253.6 543.7C253.9 543.9 254.3 544 254.7 544L321.2 544C321.6 544 322 543.9 322.3 543.7C322.6 543.5 322.9 543.2 323.1 542.9L431.9 352.3C432.1 352 432.2 351.6 432.2 351.2C432.2 350.8 432.1 350.4 431.9 350.1C431.7 349.8 431.4 349.5 431.1 349.3C430.8 349.1 430.4 349 430 349z"/>
						</svg>
						{t('common.connect')}
					</span>
				</button>
			{/if}
		</div>
	</div>
</header>

<!-- Spacer for fixed header -->
<div class="h-16"></div>

<!-- Login Modal -->
<LoginModal bind:isOpen={showLoginModal} onSuccess={handleLoginSuccess} />
