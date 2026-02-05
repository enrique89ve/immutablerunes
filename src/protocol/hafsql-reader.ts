import { CUSTOM_JSON_ID, HAFSQL_API_ENDPOINT } from '@/lib/constants';
import {
	parsePayload,
	isManifest,
	isFragment,
	reconstructFromPayloads,
	type ImageManifest,
	type ImageFragment
} from './payload-builder';

interface HafSQLOperation {
	id: string;
	timestamp: string;
	required_auths: string[];
	required_posting_auths: string[];
	custom_id: string;
	json: string;
	block_num: number;
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

export async function getExploreImages(limit: number = 30): Promise<ExploreImage[]> {
	const url = new URL(`${HAFSQL_API_ENDPOINT}/operations/custom_json/${CUSTOM_JSON_ID}`);
	url.searchParams.set('limit', '-500');

	const response = await fetch(url.toString());

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`HafSQL API error: ${response.status} - ${errorText}`);
	}

	const operations: HafSQLOperation[] = await response.json();

	return parseHafSQLOperations(operations, limit);
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
