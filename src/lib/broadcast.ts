import type { ProcessedImage } from './types';
import type { KeychainBroadcastResponse } from './hive-keychain';
import {
	buildImageUploadBatch,
	getBatchOperations,
	validateBatchSizes,
	type CustomJsonOperation,
	type UploadOptions
} from '@/protocol/payload-builder';

export type HiveOperation = [
	'custom_json',
	{
		required_auths: string[];
		required_posting_auths: string[];
		id: string;
		json: string;
	}
];

export type BroadcastResult =
	| BroadcastSuccess
	| BroadcastFailure;

export interface BroadcastSuccess {
	success: true;
	transactionId: string;
	batchIndex: number;
	operationsInBatch: number;
}

export interface BroadcastFailure {
	success: false;
	error: string;
	batchIndex: number;
	operationsInBatch: number;
}

export interface BroadcastProgress {
	current: number;
	total: number;
	status: 'pending' | 'broadcasting' | 'confirmed' | 'failed';
	message: string;
	imageId?: string;
}

export type BroadcastProgressCallback = (progress: BroadcastProgress) => void;

export interface UploadResult {
	success: boolean;
	imageId: string;
	results: BroadcastResult[];
	totalTransactions: number;
	error?: string;
}

export const MAX_OPERATIONS_PER_BATCH = 5;
const BROADCAST_DELAY_MS = 3000;

export function isKeychainAvailable(): boolean {
	return typeof window !== 'undefined' && !!window.hive_keychain;
}

function toHiveOperation(operation: CustomJsonOperation): HiveOperation {
	return [
		'custom_json',
		{
			required_auths: [],
			required_posting_auths: operation.required_posting_auths,
			id: operation.id,
			json: operation.json
		}
	];
}

function chunkArray<T>(array: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += size) {
		chunks.push(array.slice(i, i + size));
	}
	return chunks;
}

async function broadcastBatch(
	operations: HiveOperation[],
	username: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
	return new Promise((resolve) => {
		if (!window.hive_keychain) {
			resolve({ success: false, error: 'Hive Keychain no está instalado' });
			return;
		}

		window.hive_keychain.requestBroadcast(
			username,
			operations,
			'Posting',
			(response: KeychainBroadcastResponse) => {
				if (response.success && response.result) {
					resolve({
						success: true,
						transactionId: response.result.id ?? 'unknown'
					});
				} else {
					resolve({
						success: false,
						error: response.message ?? 'Error desconocido al transmitir'
					});
				}
			}
		);
	});
}

export async function uploadImage(
	image: ProcessedImage,
	username: string,
	onProgress?: BroadcastProgressCallback,
	options?: UploadOptions
): Promise<UploadResult> {
	const imageBatch = buildImageUploadBatch(image, username, options);

	const sizeValidation = validateBatchSizes(imageBatch);
	if (!sizeValidation.valid) {
		const oversized = sizeValidation.oversizedOperations[0];
		return {
			success: false,
			imageId: imageBatch.imageId,
			results: [],
			totalTransactions: 0,
			error: `Operación ${oversized.type} excede el límite de Hive (${oversized.size}/${oversized.maxSize} bytes)`
		};
	}

	if (sizeValidation.warnings.length > 0) {
		console.warn('[uploadImage] Size warnings:', sizeValidation.warnings);
	}

	const allOperations = getBatchOperations(imageBatch);
	const hiveOperations = allOperations.map(toHiveOperation);

	const batches = chunkArray(hiveOperations, MAX_OPERATIONS_PER_BATCH);
	const totalBatches = batches.length;
	const totalOperations = hiveOperations.length;
	const results: BroadcastResult[] = [];

	onProgress?.({
		current: 0,
		total: totalBatches,
		status: 'pending',
		message: `Preparando ${totalOperations} operaciones en ${totalBatches} transacción(es)...`,
		imageId: imageBatch.imageId
	});

	for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
		const batch = batches[batchIndex];
		const operationsInBatch = batch.length;

		onProgress?.({
			current: batchIndex + 1,
			total: totalBatches,
			status: 'broadcasting',
			message: totalBatches === 1
				? `Firmando ${operationsInBatch} operación(es)...`
				: `Firmando transacción ${batchIndex + 1} de ${totalBatches} (${operationsInBatch} ops)...`,
			imageId: imageBatch.imageId
		});

		const response = await broadcastBatch(batch, username);

		if (response.success) {
			results.push({
				success: true,
				transactionId: response.transactionId!,
				batchIndex,
				operationsInBatch
			});

			onProgress?.({
				current: batchIndex + 1,
				total: totalBatches,
				status: 'confirmed',
				message: totalBatches === 1
					? 'Transacción confirmada'
					: `Transacción ${batchIndex + 1} de ${totalBatches} confirmada`,
				imageId: imageBatch.imageId
			});
		} else {
			results.push({
				success: false,
				error: response.error!,
				batchIndex,
				operationsInBatch
			});

			onProgress?.({
				current: batchIndex + 1,
				total: totalBatches,
				status: 'failed',
				message: `Error: ${response.error}`,
				imageId: imageBatch.imageId
			});

			return {
				success: false,
				imageId: imageBatch.imageId,
				results,
				totalTransactions: batchIndex,
				error: response.error
			};
		}

		if (batchIndex < batches.length - 1) {
			await delay(BROADCAST_DELAY_MS);
		}
	}

	onProgress?.({
		current: totalBatches,
		total: totalBatches,
		status: 'confirmed',
		message: '¡Imagen subida exitosamente!',
		imageId: imageBatch.imageId
	});

	return {
		success: true,
		imageId: imageBatch.imageId,
		results,
		totalTransactions: totalBatches
	};
}

export function estimateUploadCost(
	image: ProcessedImage,
	options?: UploadOptions
): {
	operations: number;
	transactions: number;
	estimatedBytes: number;
} {
	const batch = buildImageUploadBatch(image, 'temp', options);
	const operations = getBatchOperations(batch);

	const estimatedBytes = operations.reduce(
		(sum, op) => sum + op.json.length,
		0
	);

	return {
		operations: operations.length,
		transactions: Math.ceil(operations.length / MAX_OPERATIONS_PER_BATCH),
		estimatedBytes
	};
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function isUploadComplete(results: BroadcastResult[]): boolean {
	return results.length > 0 && results.every(r => r.success);
}

export function getFirstError(results: BroadcastResult[]): string | null {
	const failed = results.find(r => !r.success);
	return failed && !failed.success ? failed.error : null;
}
