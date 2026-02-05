import { createHiveChain } from '@hiveio/wax';
import WaxHafah from '@hiveio/wax-api-hafah';
import type { HafahBackendParticipationMode } from '@hiveio/wax-api-hafah';
import {
	CUSTOM_JSON_ID,
	PIXEL_IMAGE_GENESIS_BLOCK,
	HAF_API_ENDPOINT
} from '@/lib/constants';
import {
	parsePayload,
	isManifest,
	isFragment,
	reconstructFromPayloads,
	type ImageManifest,
	type ImageFragment
} from './payload-builder';

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

interface CustomJsonValue {
	id?: string;
	json?: string;
	required_posting_auths?: string[];
}

const CUSTOM_JSON_OP_TYPE = '18';
const DEFAULT_PAGE_SIZE = 100;
const DATA_SIZE_LIMIT = 200000;

const fixedWaxHafah = {
	...WaxHafah,
	hafahApi: {
		...WaxHafah.hafahApi,
		urlPath: 'hafah-api',
	},
} as const;

type ExtendedChain = Awaited<ReturnType<typeof createExtendedChain>>;
let chainInstance: ExtendedChain | null = null;

async function createExtendedChain() {
	const chain = await createHiveChain({ apiEndpoint: HAF_API_ENDPOINT });
	return chain.extendRest(fixedWaxHafah);
}

async function getChain(): Promise<ExtendedChain> {
	if (!chainInstance) {
		chainInstance = await createExtendedChain();
	}
	return chainInstance;
}

export async function getUserImages(username: string): Promise<StoredImage[]> {
	if (!username) {
		throw new Error('Username is required');
	}

	const chain = await getChain();

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
			console.warn(
				`[parseOperationsToImages] Incomplete image ${imageId}: ` +
				`expected ${manifest.totalFragments} fragments, got ${fragments.length}`
			);
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

export async function getRecentImages(limit: number = 20): Promise<StoredImage[]> {
	const chain = await getChain();

	const headBlock = await chain.restApi.hafahApi.headblock();

	const response = await chain.restApi.hafahApi.operations({
		'from-block': PIXEL_IMAGE_GENESIS_BLOCK.toString(),
		'to-block': headBlock.toString(),
		'operation-types': CUSTOM_JSON_OP_TYPE,
		'page-size': 1000,
		'include-reversible': true
	});

	if (!response.ops) {
		return [];
	}

	const pixelImageOps = response.ops.filter(op => {
		if (!op.op || op.op.type !== 'custom_json_operation') return false;
		const value = op.op.value as CustomJsonValue;
		return value?.id === CUSTOM_JSON_ID;
	});

	const images = parseOperationsToImages(pixelImageOps);
	return images.slice(0, limit);
}

export async function getImageById(
	imageId: string,
	author: string
): Promise<StoredImage | null> {
	const images = await getUserImages(author);
	return images.find(img => img.imageId === imageId) ?? null;
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

export type GetImageByTxidResult =
	| { success: true; image: TransactionImage }
	| { success: false; error: string };

export async function getImageByTxid(txid: string): Promise<GetImageByTxidResult> {
	if (!txid || txid.length !== 40) {
		return { success: false, error: 'Transaction ID inválido' };
	}

	try {
		const chain = await getChain();

		const tx = await chain.restApi.hafahApi.transactions.transactionId({
			transactionId: txid,
			'include-virtual': false
		});

		if (!tx.transaction_json?.operations) {
			return { success: false, error: 'Transacción no encontrada o sin operaciones' };
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
			return { success: false, error: 'No se encontró manifest de imagen en esta transacción' };
		}

		if (fragments.length !== manifest.totalFragments) {
			return {
				success: false,
				error: `Imagen incompleta: se esperaban ${manifest.totalFragments} fragmentos, se encontraron ${fragments.length}`
			};
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
			};
		} catch (error) {
			return {
				success: false,
				error: `Error al reconstruir imagen: ${error instanceof Error ? error.message : 'desconocido'}`
			};
		}
	} catch (error) {
		return {
			success: false,
			error: `Error al buscar transacción: ${error instanceof Error ? error.message : 'desconocido'}`
		};
	}
}
