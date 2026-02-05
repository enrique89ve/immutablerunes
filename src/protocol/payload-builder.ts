import {
	CUSTOM_JSON_ID,
	MAX_FRAGMENT_SIZE,
	HIVE_CUSTOM_JSON_MAX_SIZE,
	SAFE_OPERATION_SIZE
} from '@/lib/constants';
import type { ProcessedImage, SupportedMimeType } from '@/lib/types';

export interface ImageManifest {
	type: 'manifest';
	version: 1;
	imageId: string;
	author: string;
	title?: string;
	width: number;
	height: number;
	mimeType: SupportedMimeType;
	aspectRatio: string;
	totalFragments: number;
	totalSize: number;
	hasTransparency: boolean;
	createdAt: number;
}

export interface ImageFragment {
	type: 'fragment';
	imageId: string;
	index: number;
	data: string;
}

export type PixelImagePayload = ImageManifest | ImageFragment;

export interface CustomJsonOperation {
	id: string;
	json: string;
	required_posting_auths: string[];
}

export interface ImageUploadBatch {
	imageId: string;
	manifest: CustomJsonOperation;
	fragments: CustomJsonOperation[];
	totalOperations: number;
}

function generateImageId(): string {
	return crypto.randomUUID();
}

function splitBase64(base64Data: string): string[] {
	const chunks: string[] = [];

	for (let i = 0; i < base64Data.length; i += MAX_FRAGMENT_SIZE) {
		chunks.push(base64Data.slice(i, i + MAX_FRAGMENT_SIZE));
	}

	return chunks;
}

export interface UploadOptions {
	title?: string;
}

function createManifest(
	imageId: string,
	author: string,
	image: ProcessedImage,
	totalFragments: number,
	options?: UploadOptions
): ImageManifest {
	const manifest: ImageManifest = {
		type: 'manifest',
		version: 1,
		imageId,
		author,
		width: image.width,
		height: image.height,
		mimeType: 'image/webp',
		aspectRatio: image.aspectRatio.label,
		totalFragments,
		totalSize: image.base64Size,
		hasTransparency: image.hasTransparency,
		createdAt: Date.now()
	};

	if (options?.title) {
		manifest.title = options.title;
	}

	return manifest;
}

function createFragment(
	imageId: string,
	index: number,
	data: string
): ImageFragment {
	return {
		type: 'fragment',
		imageId,
		index,
		data
	};
}

function toCustomJsonOperation(
	payload: PixelImagePayload,
	author: string
): CustomJsonOperation {
	return {
		id: CUSTOM_JSON_ID,
		json: JSON.stringify(payload),
		required_posting_auths: [author]
	};
}

export function buildImageUploadBatch(
	image: ProcessedImage,
	author: string,
	options?: UploadOptions
): ImageUploadBatch {
	const imageId = generateImageId();
	const chunks = splitBase64(image.base64Data);
	const totalFragments = chunks.length;

	const manifestPayload = createManifest(imageId, author, image, totalFragments, options);
	const manifest = toCustomJsonOperation(manifestPayload, author);

	const fragments = chunks.map((chunk, index) => {
		const fragmentPayload = createFragment(imageId, index, chunk);
		return toCustomJsonOperation(fragmentPayload, author);
	});

	return {
		imageId,
		manifest,
		fragments,
		totalOperations: 1 + fragments.length
	};
}

export function getBatchOperations(batch: ImageUploadBatch): CustomJsonOperation[] {
	return [batch.manifest, ...batch.fragments];
}

export function calculateBatchSize(batch: ImageUploadBatch): number {
	const manifestSize = batch.manifest.json.length;
	const fragmentsSize = batch.fragments.reduce((sum, f) => sum + f.json.length, 0);
	return manifestSize + fragmentsSize;
}

export interface OperationSizeInfo {
	index: number;
	type: 'manifest' | 'fragment';
	size: number;
	maxSize: number;
	safeSize: number;
	isWithinLimit: boolean;
	isWithinSafeLimit: boolean;
	percentUsed: number;
}

export interface BatchSizeValidation {
	valid: boolean;
	totalSize: number;
	operations: OperationSizeInfo[];
	oversizedOperations: OperationSizeInfo[];
	warnings: string[];
}

function getOperationSizeInfo(
	operation: CustomJsonOperation,
	index: number,
	type: 'manifest' | 'fragment'
): OperationSizeInfo {
	const size = operation.json.length;
	const percentUsed = (size / HIVE_CUSTOM_JSON_MAX_SIZE) * 100;

	return {
		index,
		type,
		size,
		maxSize: HIVE_CUSTOM_JSON_MAX_SIZE,
		safeSize: SAFE_OPERATION_SIZE,
		isWithinLimit: size <= HIVE_CUSTOM_JSON_MAX_SIZE,
		isWithinSafeLimit: size <= SAFE_OPERATION_SIZE,
		percentUsed: Math.round(percentUsed * 100) / 100
	};
}

export function validateBatchSizes(batch: ImageUploadBatch): BatchSizeValidation {
	const operations: OperationSizeInfo[] = [];
	const warnings: string[] = [];

	const manifestInfo = getOperationSizeInfo(batch.manifest, 0, 'manifest');
	operations.push(manifestInfo);

	if (!manifestInfo.isWithinLimit) {
		warnings.push(`Manifest excede límite máximo (${manifestInfo.size}/${HIVE_CUSTOM_JSON_MAX_SIZE} bytes)`);
	} else if (!manifestInfo.isWithinSafeLimit) {
		warnings.push(`Manifest cerca del límite (${manifestInfo.percentUsed.toFixed(1)}% usado)`);
	}

	batch.fragments.forEach((fragment, i) => {
		const info = getOperationSizeInfo(fragment, i + 1, 'fragment');
		operations.push(info);

		if (!info.isWithinLimit) {
			warnings.push(`Fragment ${i} excede límite máximo (${info.size}/${HIVE_CUSTOM_JSON_MAX_SIZE} bytes)`);
		} else if (!info.isWithinSafeLimit) {
			warnings.push(`Fragment ${i} cerca del límite (${info.percentUsed.toFixed(1)}% usado)`);
		}
	});

	const oversizedOperations = operations.filter(op => !op.isWithinLimit);
	const totalSize = operations.reduce((sum, op) => sum + op.size, 0);

	return {
		valid: oversizedOperations.length === 0,
		totalSize,
		operations,
		oversizedOperations,
		warnings
	};
}

export function isBatchSafeForBroadcast(batch: ImageUploadBatch): boolean {
	const validation = validateBatchSizes(batch);
	return validation.valid && validation.operations.every(op => op.isWithinSafeLimit);
}

export function isManifest(payload: unknown): payload is ImageManifest {
	if (typeof payload !== 'object' || payload === null) return false;

	const p = payload as Record<string, unknown>;

	return (
		p.type === 'manifest' &&
		p.version === 1 &&
		typeof p.imageId === 'string' &&
		p.imageId.length > 0 &&
		typeof p.author === 'string' &&
		p.author.length > 0 &&
		typeof p.width === 'number' &&
		p.width > 0 &&
		typeof p.height === 'number' &&
		p.height > 0 &&
		(p.mimeType === 'image/webp' || p.mimeType === 'image/png') &&
		typeof p.aspectRatio === 'string' &&
		typeof p.totalFragments === 'number' &&
		p.totalFragments > 0 &&
		typeof p.totalSize === 'number' &&
		p.totalSize > 0 &&
		typeof p.hasTransparency === 'boolean' &&
		typeof p.createdAt === 'number' &&
		p.createdAt > 0
	);
}

export function isFragment(payload: unknown): payload is ImageFragment {
	if (typeof payload !== 'object' || payload === null) return false;

	const p = payload as Record<string, unknown>;

	return (
		p.type === 'fragment' &&
		typeof p.imageId === 'string' &&
		p.imageId.length > 0 &&
		typeof p.index === 'number' &&
		p.index >= 0 &&
		Number.isInteger(p.index) &&
		typeof p.data === 'string' &&
		p.data.length > 0
	);
}

export function isValidBase64(str: string): boolean {
	if (str.length === 0) return false;

	const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

	if (!base64Regex.test(str)) return false;

	return str.length % 4 === 0 || str.length % 4 === 2 || str.length % 4 === 3;
}

export function parsePayload(json: string): PixelImagePayload | null {
	try {
		const parsed = JSON.parse(json);

		if (isManifest(parsed) || isFragment(parsed)) {
			return parsed;
		}

		return null;
	} catch {
		return null;
	}
}

export interface FragmentValidationResult {
	valid: boolean;
	error?: string;
	missingIndices?: number[];
	duplicateIndices?: number[];
}

export function validateFragments(
	manifest: ImageManifest,
	fragments: ImageFragment[]
): FragmentValidationResult {
	if (fragments.length !== manifest.totalFragments) {
		return {
			valid: false,
			error: `Missing fragments: expected ${manifest.totalFragments}, got ${fragments.length}`
		};
	}

	const mismatchedFragment = fragments.find(f => f.imageId !== manifest.imageId);
	if (mismatchedFragment) {
		return {
			valid: false,
			error: `Fragment ${mismatchedFragment.index} has mismatched imageId`
		};
	}

	const indices = fragments.map(f => f.index);
	const uniqueIndices = new Set(indices);

	if (uniqueIndices.size !== indices.length) {
		const duplicates = indices.filter((idx, i) => indices.indexOf(idx) !== i);
		return {
			valid: false,
			error: `Duplicate fragment indices found`,
			duplicateIndices: [...new Set(duplicates)]
		};
	}

	const expectedIndices = Array.from({ length: manifest.totalFragments }, (_, i) => i);
	const missingIndices = expectedIndices.filter(i => !uniqueIndices.has(i));

	if (missingIndices.length > 0) {
		return {
			valid: false,
			error: `Missing fragment indices: ${missingIndices.join(', ')}`,
			missingIndices
		};
	}

	const outOfBounds = indices.filter(i => i < 0 || i >= manifest.totalFragments);
	if (outOfBounds.length > 0) {
		return {
			valid: false,
			error: `Fragment indices out of bounds: ${outOfBounds.join(', ')}`
		};
	}

	return { valid: true };
}

export function reconstructFromPayloads(
	manifest: ImageManifest,
	fragments: ImageFragment[]
): string {
	const validation = validateFragments(manifest, fragments);

	if (!validation.valid) {
		throw new Error(validation.error);
	}

	const sorted = [...fragments].sort((a, b) => a.index - b.index);
	const base64Data = sorted.map(f => f.data).join('');

	return `data:${manifest.mimeType};base64,${base64Data}`;
}

export function tryReconstructFromPayloads(
	manifest: ImageManifest,
	fragments: ImageFragment[]
): string | null {
	try {
		return reconstructFromPayloads(manifest, fragments);
	} catch {
		return null;
	}
}
