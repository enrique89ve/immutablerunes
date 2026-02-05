export type SupportedMimeType = 'image/png' | 'image/webp';

export interface AspectRatioInfo {
	ratio: number;
	label: string;
}

export interface ProcessedImage {
	blob: Blob;
	dataUrl: string;
	width: number;
	height: number;
	originalWidth: number;
	originalHeight: number;
	wasResized: boolean;
	aspectRatio: AspectRatioInfo;
	base64Data: string;
	base64Size: number;
	hasTransparency: boolean;
}

export type ImageValidationResult =
	| ImageValidationSuccess
	| ImageValidationFailure;

export interface ImageValidationSuccess {
	valid: true;
	aspectRatio: AspectRatioInfo;
	originalWidth: number;
	originalHeight: number;
	detectedRatio: number;
	hasTransparency?: boolean;
}

export interface ImageValidationFailure {
	valid: false;
	originalWidth: number;
	originalHeight: number;
	detectedRatio: number;
	error: string;
}

export interface PixelImageFragment {
	imageId: string;
	fragmentIndex: number;
	totalFragments: number;
	data: string;
	mimeType: SupportedMimeType;
	author: string;
	createdAt: number;
}

export interface FragmentValidation {
	valid: boolean;
	size: number;
	fragmentCount: number;
}
