import { getChain, withRetry } from '@/lib/hive-chain-manager';
import type { HafahBackendParticipationMode } from '@hiveio/wax-api-hafah';
import { CUSTOM_JSON_ID, HAFSQL_API_ENDPOINT } from '@/lib/constants';
import {
	parsePayload,
	isManifest,
	isFragment,
	reconstructFromPayloads,
	type ImageManifest,
	type ImageFragment
} from './payload-builder';

const CACHE_TTL = 10_000;

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;

	const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
	if (isExpired) {
		cache.delete(key);
		return null;
	}

	return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
	cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(): void {
	cache.clear();
}

export function invalidateCache(key: string): void {
	cache.delete(key);
}

export function invalidateUserCache(username: string): void {
	cache.delete(`user:${username}`);
}

export interface StoredImage {
	imageId: string;
	author: string;
	dataUrl: string;
	width: number;
	height: number;
	aspectRatio: string;
	hasTransparency: boolean;
	createdAt: number;
	blockNumber?: number;
}

export interface TransactionImage {
	imageId: string;
	author: string;
	dataUrl: string;
	width: number;
	height: number;
	aspectRatio: string;
	hasTransparency: boolean;
	createdAt: number;
	txid: string;
	blockNumber?: number;
}

export interface ExploreImage {
	imageId: string;
	author: string;
	dataUrl: string;
	width: number;
	height: number;
	aspectRatio: string;
	hasTransparency: boolean;
	createdAt: number;
	blockNumber: number;
	timestamp: string;
}

export type GetImageByTxidResult =
	| { success: true; image: TransactionImage }
	| { success: false; error: string };

interface CustomJsonValue {
	id?: string;
	json?: string;
	required_posting_auths?: string[];
}

interface HafSQLOperation {
	id: string;
	timestamp: string;
	required_auths: string[];
	required_posting_auths: string[];
	custom_id: string;
	json: string;
	block_num: number;
}

export async function getImageByTxidClient(txid: string): Promise<GetImageByTxidResult> {
	if (!txid || txid.length !== 40) {
		return { success: false, error: 'Transaction ID inválido' };
	}

	const cacheKey = `txid:${txid}`;
	const cached = getCached<GetImageByTxidResult>(cacheKey);
	if (cached) return cached;

	try {
		const result = await withRetry(async (chain) => {
			const tx = await chain.restApi.hafahApi.transactions.transactionId({
				transactionId: txid,
				'include-virtual': false
			});

			if (!tx.transaction_json?.operations) {
				return { success: false, error: 'Transacción no encontrada o sin operaciones' } as const;
			}

			let manifest: ImageManifest | null = null;
			const fragments: ImageFragment[] = [];

			for (const op of tx.transaction_json.operations) {
				if (op.type !== 'custom_json_operation') continue;

				const value = op.value as CustomJsonValue;
				if (!value || value.id !== CUSTOM_JSON_ID) continue;
				if (!value.json) continue;

				const payload = parsePayload(value.json);
				if (!payload) continue;

				if (isManifest(payload)) {
					manifest = payload;
				} else if (isFragment(payload)) {
					fragments.push(payload);
				}
			}

			if (!manifest) {
				return { success: false, error: 'No se encontró manifest de imagen en esta transacción' } as const;
			}

			if (fragments.length !== manifest.totalFragments) {
				return {
					success: false,
					error: `Imagen incompleta: se esperaban ${manifest.totalFragments} fragmentos, se encontraron ${fragments.length}`
				} as const;
			}

			try {
				const dataUrl = reconstructFromPayloads(manifest, fragments);

				return {
					success: true,
					image: {
						imageId: manifest.imageId,
						author: manifest.author,
						dataUrl,
						width: manifest.width,
						height: manifest.height,
						aspectRatio: manifest.aspectRatio,
						hasTransparency: manifest.hasTransparency,
						createdAt: manifest.createdAt,
						txid,
						blockNumber: tx.block_num
					}
				} as const;
			} catch (error) {
				return {
					success: false,
					error: `Error al reconstruir imagen: ${error instanceof Error ? error.message : 'desconocido'}`
				} as const;
			}
		});

		setCache(cacheKey, result);
		return result;
	} catch (error) {
		const result: GetImageByTxidResult = {
			success: false,
			error: `Error al buscar transacción: ${error instanceof Error ? error.message : 'desconocido'}`
		};
		return result;
	}
}

const CUSTOM_JSON_OP_TYPE = '18';
const DEFAULT_PAGE_SIZE = 100;
const DATA_SIZE_LIMIT = 200000;

export async function getUserImagesClient(username: string): Promise<StoredImage[]> {
	if (!username) {
		throw new Error('Username is required');
	}

	const cacheKey = `user:${username}`;
	const cached = getCached<StoredImage[]>(cacheKey);
	if (cached) return cached;

	const result = await withRetry(async (chain) => {
		const firstResponse = await chain.restApi.hafahApi.accounts.accountName.operations({
			accountName: username,
			'transacting-account-name': username,
			'participation-mode': 'include' as HafahBackendParticipationMode,
			'operation-types': CUSTOM_JSON_OP_TYPE,
			'page-size': DEFAULT_PAGE_SIZE,
			'data-size-limit': DATA_SIZE_LIMIT
		});

		const allOperations = [...(firstResponse.operations_result ?? [])];
		const totalPages = firstResponse.total_pages ?? 1;

		for (let page = totalPages - 1; page > 0; page--) {
			const response = await chain.restApi.hafahApi.accounts.accountName.operations({
				accountName: username,
				'transacting-account-name': username,
				'participation-mode': 'include' as HafahBackendParticipationMode,
				'operation-types': CUSTOM_JSON_OP_TYPE,
				'page-size': DEFAULT_PAGE_SIZE,
				'data-size-limit': DATA_SIZE_LIMIT,
				page
			});

			if (response.operations_result) {
				allOperations.push(...response.operations_result);
			}
		}

		return parseOperationsToImages(allOperations);
	});

	setCache(cacheKey, result);
	return result;
}

function parseOperationsToImages(
	operations: Array<{
		block?: number;
		op?: { type?: string; value?: object };
	}>
): StoredImage[] {
	const manifests = new Map<string, { manifest: ImageManifest; blockNum?: number }>();
	const fragmentsByImage = new Map<string, ImageFragment[]>();

	for (const operation of operations) {
		if (!operation.op || operation.op.type !== 'custom_json_operation') continue;

		const value = operation.op.value as CustomJsonValue;
		if (!value || value.id !== CUSTOM_JSON_ID) continue;
		if (!value.json) continue;

		const payload = parsePayload(value.json);
		if (!payload) continue;

		if (isManifest(payload)) {
			manifests.set(payload.imageId, {
				manifest: payload,
				blockNum: operation.block
			});
		} else if (isFragment(payload)) {
			const existing = fragmentsByImage.get(payload.imageId) ?? [];
			existing.push(payload);
			fragmentsByImage.set(payload.imageId, existing);
		}
	}

	const images: StoredImage[] = [];

	for (const [imageId, { manifest, blockNum }] of manifests) {
		const fragments = fragmentsByImage.get(imageId) ?? [];

		if (fragments.length !== manifest.totalFragments) {
			continue;
		}

		try {
			const dataUrl = reconstructFromPayloads(manifest, fragments);

			images.push({
				imageId: manifest.imageId,
				author: manifest.author,
				dataUrl,
				width: manifest.width,
				height: manifest.height,
				aspectRatio: manifest.aspectRatio,
				hasTransparency: manifest.hasTransparency,
				createdAt: manifest.createdAt,
				blockNumber: blockNum
			});
		} catch (error) {
			console.warn(`[parseOperationsToImages] Failed to reconstruct ${imageId}:`, error);
		}
	}

	return images.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getExploreImagesClient(limit: number = 30): Promise<ExploreImage[]> {
	const cacheKey = `explore:${limit}`;
	const cached = getCached<ExploreImage[]>(cacheKey);
	if (cached) return cached;

	const url = new URL(`${HAFSQL_API_ENDPOINT}/operations/custom_json/${CUSTOM_JSON_ID}`);
	url.searchParams.set('limit', '-500');

	const response = await fetch(url.toString());

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`HafSQL API error: ${response.status} - ${errorText}`);
	}

	const operations: HafSQLOperation[] = await response.json();
	const result = parseHafSQLOperations(operations, limit);

	setCache(cacheKey, result);
	return result;
}

function parseHafSQLOperations(
	operations: HafSQLOperation[],
	limit: number
): ExploreImage[] {
	const manifests = new Map<string, { manifest: ImageManifest; blockNum: number; timestamp: string }>();
	const fragmentsByImage = new Map<string, ImageFragment[]>();

	for (const op of operations) {
		if (!op.json) continue;

		const payload = parsePayload(op.json);
		if (!payload) continue;

		if (isManifest(payload)) {
			manifests.set(payload.imageId, {
				manifest: payload,
				blockNum: op.block_num,
				timestamp: op.timestamp
			});
		} else if (isFragment(payload)) {
			const existing = fragmentsByImage.get(payload.imageId) ?? [];
			existing.push(payload);
			fragmentsByImage.set(payload.imageId, existing);
		}
	}

	const images: ExploreImage[] = [];

	for (const [imageId, { manifest, blockNum, timestamp }] of manifests) {
		const fragments = fragmentsByImage.get(imageId) ?? [];

		if (fragments.length !== manifest.totalFragments) {
			continue;
		}

		try {
			const dataUrl = reconstructFromPayloads(manifest, fragments);

			images.push({
				imageId: manifest.imageId,
				author: manifest.author,
				dataUrl,
				width: manifest.width,
				height: manifest.height,
				aspectRatio: manifest.aspectRatio,
				hasTransparency: manifest.hasTransparency,
				createdAt: manifest.createdAt,
				blockNumber: blockNum,
				timestamp
			});
		} catch (error) {
			console.warn(`[parseHafSQLOperations] Failed to reconstruct ${imageId}:`, error);
		}

		if (images.length >= limit) {
			break;
		}
	}

	return images.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
