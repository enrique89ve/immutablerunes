/**
 * Type declarations for Hive Keychain browser extension
 * @see https://github.com/hive-keychain/keychain-sdk
 */

export interface KeychainBroadcastResponse {
	success: boolean;
	result?: {
		id?: string;
		block_num?: number;
		trx_num?: number;
		expired?: boolean;
	};
	message?: string;
	error?: string;
}

export type KeychainCallback = (response: KeychainBroadcastResponse) => void;

export type HiveOperationType =
	| 'custom_json'
	| 'transfer'
	| 'vote'
	| 'comment'
	| 'comment_options';

export type KeychainHiveOperation = [HiveOperationType, Record<string, unknown>];

export interface HiveKeychain {
	/**
	 * Broadcast multiple operations in a single transaction
	 * @param username - Hive username
	 * @param operations - Array of operations (max 5 for custom_json)
	 * @param keyType - Key type to use for signing
	 * @param callback - Callback with result
	 */
	requestBroadcast(
		username: string,
		operations: KeychainHiveOperation[],
		keyType: 'Posting' | 'Active' | 'Memo',
		callback: KeychainCallback
	): void;

	/**
	 * Request a handshake to verify Keychain is available
	 */
	requestHandshake(callback: () => void): void;

	/**
	 * Request to sign a buffer/message
	 */
	requestSignBuffer(
		username: string | null,
		message: string,
		keyType: 'Posting' | 'Active' | 'Memo',
		callback: KeychainCallback
	): void;
}

declare global {
	interface Window {
		hive_keychain?: HiveKeychain;
	}
}
