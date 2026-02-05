import { createHiveChain, type IHiveChainInterface } from '@hiveio/wax';
import WaxHafah from '@hiveio/wax-api-hafah';

export interface HiveNode {
	url: string;
	name: string;
	priority: number;
}

export interface ChainHealth {
	node: string;
	healthy: boolean;
	latency?: number;
	lastCheck: number;
	error?: string;
}

type ExtendedChain = IHiveChainInterface & {
	restApi: ReturnType<typeof createExtendedRestApi>;
};

type ExtendedRestApi = ReturnType<IHiveChainInterface['extendRest']>['restApi'];

function createExtendedRestApi(chain: IHiveChainInterface) {
	return chain.extendRest(fixedWaxHafah).restApi;
}

const HIVE_NODES: HiveNode[] = [
	{
		url: 'https://api.syncad.com',
		name: 'Syncad HAF',
		priority: 1
	},
	{
		url: 'https://api.hive.blog',
		name: 'Hive Blog',
		priority: 2
	}
];

const HEALTH_CHECK_TIMEOUT = 5000;
const HEALTH_CACHE_TTL = 60000;
const MAX_RETRIES = 2;

const fixedWaxHafah = {
	...WaxHafah,
	hafahApi: {
		...WaxHafah.hafahApi,
		urlPath: 'hafah-api',
	},
} as const;

let currentChain: ExtendedChain | null = null;
let currentNode: HiveNode | null = null;
const healthCache = new Map<string, ChainHealth>();

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
const INACTIVITY_TIMEOUT = 30000;

async function checkNodeHealth(node: HiveNode): Promise<ChainHealth> {
	const cached = healthCache.get(node.url);
	if (cached && Date.now() - cached.lastCheck < HEALTH_CACHE_TTL) {
		return cached;
	}

	const startTime = Date.now();

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

		const response = await fetch(`${node.url}/hafah-api/headblock`, {
			signal: controller.signal,
			headers: { 'Accept': 'application/json' }
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const latency = Date.now() - startTime;
		const health: ChainHealth = {
			node: node.url,
			healthy: true,
			latency,
			lastCheck: Date.now()
		};

		healthCache.set(node.url, health);
		return health;
	} catch (error) {
		const health: ChainHealth = {
			node: node.url,
			healthy: false,
			lastCheck: Date.now(),
			error: error instanceof Error ? error.message : 'Unknown error'
		};

		healthCache.set(node.url, health);
		return health;
	}
}

async function findBestNode(): Promise<HiveNode> {
	for (const node of HIVE_NODES) {
		const health = await checkNodeHealth(node);

		if (health.healthy) {
			console.log(`[HiveChainManager] Using node: ${node.name} (${node.url}) - ${health.latency}ms`);
			return node;
		}

		console.warn(`[HiveChainManager] Node unhealthy: ${node.name} - ${health.error}`);
	}

	console.warn('[HiveChainManager] All nodes unhealthy, using fallback');
	return HIVE_NODES[0];
}

async function createChainInstance(node: HiveNode): Promise<ExtendedChain> {
	const chain = await createHiveChain({ apiEndpoint: node.url });
	const extended = chain.extendRest(fixedWaxHafah);

	return extended as ExtendedChain;
}

function resetInactivityTimer(): void {
	if (typeof window === 'undefined') return;

	if (inactivityTimer) {
		clearTimeout(inactivityTimer);
	}

	inactivityTimer = setTimeout(() => {
		console.log('[HiveChainManager] Inactivity timeout, disposing chain...');
		dispose();
	}, INACTIVITY_TIMEOUT);
}

export function dispose(): void {
	if (inactivityTimer) {
		clearTimeout(inactivityTimer);
		inactivityTimer = null;
	}

	if (currentChain) {
		console.log('[HiveChainManager] Disposing chain instance');
		currentChain = null;
		currentNode = null;
	}
}

export async function getChain(): Promise<ExtendedChain> {
	resetInactivityTimer();

	if (currentChain && currentNode) {
		const health = await checkNodeHealth(currentNode);

		if (health.healthy) {
			return currentChain;
		}

		console.warn(`[HiveChainManager] Current node unhealthy, switching...`);
		currentChain = null;
		currentNode = null;
	}

	const bestNode = await findBestNode();
	currentNode = bestNode;
	currentChain = await createChainInstance(bestNode);

	return currentChain;
}

export async function withRetry<T>(
	operation: (chain: ExtendedChain) => Promise<T>,
	retries: number = MAX_RETRIES
): Promise<T> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const chain = await getChain();
			return await operation(chain);
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			console.warn(
				`[HiveChainManager] Attempt ${attempt + 1}/${retries + 1} failed:`,
				lastError.message
			);

			if (currentNode) {
				healthCache.set(currentNode.url, {
					node: currentNode.url,
					healthy: false,
					lastCheck: Date.now(),
					error: lastError.message
				});
			}

			currentChain = null;
			currentNode = null;

			if (attempt < retries) {
				await delay(1000 * (attempt + 1));
			}
		}
	}

	throw lastError ?? new Error('Operation failed after retries');
}

export async function reconnect(): Promise<void> {
	dispose();
	healthCache.clear();
	await getChain();
}

export function isActive(): boolean {
	return currentChain !== null;
}

export function getCurrentNode(): HiveNode | null {
	return currentNode;
}

export async function getAllNodesHealth(): Promise<ChainHealth[]> {
	const results: ChainHealth[] = [];

	for (const node of HIVE_NODES) {
		const health = await checkNodeHealth(node);
		results.push(health);
	}

	return results;
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
