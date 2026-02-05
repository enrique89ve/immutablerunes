import { MAX_FRAGMENT_SIZE, MAX_IMAGE_SIZE } from './constants';
import type { PixelImageFragment, FragmentValidation, SupportedMimeType } from './types';

export type { PixelImageFragment };

export function generateImageId(): string {
	return crypto.randomUUID();
}

export function validateImageSize(base64Data: string): FragmentValidation {
	const sizeInBytes = calculateBase64Size(base64Data);
	const fragmentCount = Math.ceil(base64Data.length / MAX_FRAGMENT_SIZE);
	const valid = sizeInBytes <= MAX_IMAGE_SIZE;

	return {
		valid,
		size: sizeInBytes,
		fragmentCount
	};
}

export function fragmentImage(
	base64Data: string,
	mimeType: SupportedMimeType,
	author: string
): PixelImageFragment[] {
	const validation = validateImageSize(base64Data);

	if (!validation.valid) {
		throw new Error(
			`[Fragment Error] Image size ${validation.size} bytes exceeds maximum ${MAX_IMAGE_SIZE} bytes`
		);
	}

	const imageId = generateImageId();
	const totalFragments = validation.fragmentCount;
	const createdAt = Date.now();
	const fragments: PixelImageFragment[] = [];

	for (let i = 0; i < totalFragments; i++) {
		const start = i * MAX_FRAGMENT_SIZE;
		const end = Math.min(start + MAX_FRAGMENT_SIZE, base64Data.length);
		const data = base64Data.slice(start, end);

		fragments.push({
			imageId,
			fragmentIndex: i,
			totalFragments,
			data,
			mimeType,
			author,
			createdAt
		});
	}

	return fragments;
}

export function reconstructImage(fragments: PixelImageFragment[]): string {
	if (fragments.length === 0) {
		throw new Error('[Reconstruction Error] No fragments provided');
	}

	validateFragmentIntegrity(fragments);

	const sorted = [...fragments].sort((a, b) => a.fragmentIndex - b.fragmentIndex);
	const base64Data = sorted.map(fragment => fragment.data).join('');
	const mimeType = sorted[0].mimeType;

	return `data:${mimeType};base64,${base64Data}`;
}

function calculateBase64Size(base64Data: string): number {
	const padding = (base64Data.match(/=/g) || []).length;
	return Math.floor((base64Data.length * 3) / 4) - padding;
}

function validateFragmentIntegrity(fragments: PixelImageFragment[]): void {
	const imageIds = new Set(fragments.map(f => f.imageId));

	if (imageIds.size !== 1) {
		throw new Error('[Reconstruction Error] Fragments belong to different images');
	}

	const totalFragments = fragments[0].totalFragments;

	if (fragments.length !== totalFragments) {
		throw new Error(
			`[Reconstruction Error] Expected ${totalFragments} fragments, received ${fragments.length}`
		);
	}

	const indices = fragments.map(f => f.fragmentIndex).sort((a, b) => a - b);
	const expectedIndices = Array.from({ length: totalFragments }, (_, i) => i);

	if (JSON.stringify(indices) !== JSON.stringify(expectedIndices)) {
		throw new Error('[Reconstruction Error] Missing or duplicate fragment indices');
	}
}
