/**
 * Validación de datos de Hive
 *
 * Reglas basadas en el protocolo de Hive:
 * - Username: 3-16 caracteres, lowercase alfanumérico y puntos
 * - Transaction ID: 40 caracteres hexadecimales (SHA-1 hash)
 */

/**
 * Reglas de username de Hive:
 * - Longitud: 3-16 caracteres
 * - Solo lowercase a-z, números 0-9, y puntos
 * - Debe empezar con una letra
 * - No puede terminar con punto
 * - No puede tener dos puntos consecutivos
 * - No puede tener puntos al inicio
 */
const USERNAME_REGEX = /^[a-z][a-z0-9.-]{1,14}[a-z0-9]$/;
const CONSECUTIVE_DOTS_REGEX = /\.\./;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 16;

export interface UsernameValidationResult {
	valid: boolean;
	error?: string;
	sanitized?: string;
}

export function validateUsername(username: unknown): UsernameValidationResult {
	if (typeof username !== 'string') {
		return { valid: false, error: 'Username debe ser un string' };
	}

	const trimmed = username.trim().toLowerCase();

	if (trimmed.length === 0) {
		return { valid: false, error: 'Username no puede estar vacío' };
	}

	if (trimmed.length < MIN_USERNAME_LENGTH) {
		return { valid: false, error: `Username debe tener al menos ${MIN_USERNAME_LENGTH} caracteres` };
	}

	if (trimmed.length > MAX_USERNAME_LENGTH) {
		return { valid: false, error: `Username no puede exceder ${MAX_USERNAME_LENGTH} caracteres` };
	}

	if (!/^[a-z]/.test(trimmed)) {
		return { valid: false, error: 'Username debe empezar con una letra' };
	}

	if (trimmed.endsWith('.')) {
		return { valid: false, error: 'Username no puede terminar con punto' };
	}

	if (CONSECUTIVE_DOTS_REGEX.test(trimmed)) {
		return { valid: false, error: 'Username no puede tener puntos consecutivos' };
	}

	if (!USERNAME_REGEX.test(trimmed)) {
		return { valid: false, error: 'Username solo puede contener letras minúsculas, números, puntos y guiones' };
	}

	return { valid: true, sanitized: trimmed };
}

export function isValidUsername(username: unknown): username is string {
	return validateUsername(username).valid;
}

export function sanitizeUsername(username: unknown): string | null {
	const result = validateUsername(username);
	return result.valid ? result.sanitized! : null;
}

/**
 * Reglas de Transaction ID de Hive:
 * - Exactamente 40 caracteres hexadecimales (SHA-1 hash)
 * - Case insensitive (se normaliza a lowercase)
 */
const TXID_REGEX = /^[a-f0-9]{40}$/;
const TXID_LENGTH = 40;

export interface TxidValidationResult {
	valid: boolean;
	error?: string;
	sanitized?: string;
}

export function validateTxid(txid: unknown): TxidValidationResult {
	if (typeof txid !== 'string') {
		return { valid: false, error: 'Transaction ID debe ser un string' };
	}

	const trimmed = txid.trim().toLowerCase();

	if (trimmed.length === 0) {
		return { valid: false, error: 'Transaction ID no puede estar vacío' };
	}

	if (trimmed.length !== TXID_LENGTH) {
		return { valid: false, error: `Transaction ID debe tener exactamente ${TXID_LENGTH} caracteres` };
	}

	if (!TXID_REGEX.test(trimmed)) {
		return { valid: false, error: 'Transaction ID debe ser un string hexadecimal válido' };
	}

	return { valid: true, sanitized: trimmed };
}

export function isValidTxid(txid: unknown): txid is string {
	return validateTxid(txid).valid;
}

export function sanitizeTxid(txid: unknown): string | null {
	const result = validateTxid(txid);
	return result.valid ? result.sanitized! : null;
}
