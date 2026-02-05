import type { APIRoute } from 'astro';
import { getImageByTxid } from '@/protocol';
import { sanitizeTxid } from '@/lib/validation/hive';

export const prerender = false;

/**
 * API endpoint que sirve la imagen como archivo para Open Graph
 * Uso: /api/og/[txid]
 *
 * Twitter y otras plataformas requieren una URL directa a la imagen,
 * no pueden usar data URLs.
 */
export const GET: APIRoute = async ({ params }) => {
	const txid = sanitizeTxid(params.txid);

	if (!txid) {
		return new Response('Transaction ID inválido', { status: 400 });
	}

	try {
		const result = await getImageByTxid(txid);

		if (!result.success) {
			return new Response('Image not found', { status: 404 });
		}

		// Extraer el base64 del dataUrl
		// Formato: data:image/webp;base64,XXXXXX
		const dataUrl = result.image.dataUrl;
		const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

		if (!matches) {
			return new Response('Invalid image data', { status: 500 });
		}

		const mimeType = matches[1];
		const base64Data = matches[2];

		// Convertir base64 a buffer
		const imageBuffer = Buffer.from(base64Data, 'base64');

		// Devolver la imagen con headers apropiados
		return new Response(imageBuffer, {
			status: 200,
			headers: {
				'Content-Type': mimeType,
				'Content-Length': imageBuffer.length.toString(),
				// Cache por 1 año (inmutable en blockchain)
				'Cache-Control': 'public, max-age=31536000, immutable',
				// Headers para OG/Twitter
				'X-Content-Type-Options': 'nosniff',
			}
		});
	} catch (error) {
		console.error('[OG Image Error]', error);
		return new Response('Error fetching image', { status: 500 });
	}
};
