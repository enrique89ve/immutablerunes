export type ErrorLang = 'en' | 'es';

const errorMessages = {
	en: {
		invalidTxId: 'Invalid transaction ID',
		txNotFound: 'Transaction not found or has no operations',
		manifestNotFound: 'No image manifest found in this transaction',
		incompleteImage: (expected: number, found: number) =>
			`Incomplete image: expected ${expected} fragments, found ${found}`,
		reconstructError: (msg: string) => `Error reconstructing image: ${msg}`,
		txSearchError: (msg: string) => `Error searching transaction: ${msg}`,
		txConfirmed: 'Transaction confirmed',
		txBatchConfirmed: (current: number, total: number) =>
			`Transaction ${current} of ${total} confirmed`,
		imageLoadError: 'Error loading image',
		canvasContextError: 'Could not create canvas context',
		canvasToBlobError: 'Error converting canvas to blob',
		blobReadError: 'Error reading blob',
		invalidAspectRatio: (ratio: number) =>
			`Invalid aspect ratio (${ratio.toFixed(2)}). Image is too elongated. Maximum 4:1 or 1:4.`,
		imageValidationError: 'Error validating image',
		compressionError: (maxSize: string, currentSize: string) =>
			`Could not compress image to less than ${maxSize} (current: ${currentSize}). Try a simpler image with fewer colors.`
	},
	es: {
		invalidTxId: 'Transaction ID inválido',
		txNotFound: 'Transacción no encontrada o sin operaciones',
		manifestNotFound: 'No se encontró manifest de imagen en esta transacción',
		incompleteImage: (expected: number, found: number) =>
			`Imagen incompleta: se esperaban ${expected} fragmentos, se encontraron ${found}`,
		reconstructError: (msg: string) => `Error al reconstruir imagen: ${msg}`,
		txSearchError: (msg: string) => `Error al buscar transacción: ${msg}`,
		txConfirmed: 'Transacción confirmada',
		txBatchConfirmed: (current: number, total: number) =>
			`Transacción ${current} de ${total} confirmada`,
		imageLoadError: 'Error al cargar la imagen',
		canvasContextError: 'No se pudo crear el contexto del canvas',
		canvasToBlobError: 'Error al convertir canvas a blob',
		blobReadError: 'Error al leer blob',
		invalidAspectRatio: (ratio: number) =>
			`Proporción no válida (${ratio.toFixed(2)}). La imagen es demasiado alargada. Máximo 4:1 o 1:4.`,
		imageValidationError: 'Error al validar imagen',
		compressionError: (maxSize: string, currentSize: string) =>
			`No se pudo comprimir la imagen a menos de ${maxSize} (actual: ${currentSize}). Intenta con una imagen más simple o con menos colores.`
	}
} as const;

export type ErrorKey = keyof typeof errorMessages.en;

export function getErrorMessage<K extends ErrorKey>(
	key: K,
	lang: ErrorLang = 'en'
): (typeof errorMessages)[ErrorLang][K] {
	return errorMessages[lang][key];
}

export function detectErrorLang(): ErrorLang {
	if (typeof window === 'undefined') return 'en';
	const browserLang = navigator?.language?.split('-')[0];
	return browserLang === 'es' ? 'es' : 'en';
}
