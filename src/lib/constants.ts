export const CUSTOM_JSON_ID = 'pixel_image';

export const HIVE_CUSTOM_JSON_MAX_SIZE = 8192;
export const SAFETY_MARGIN = 0.15;
export const SAFE_OPERATION_SIZE = Math.floor(HIVE_CUSTOM_JSON_MAX_SIZE * (1 - SAFETY_MARGIN));

export const FRAGMENT_JSON_OVERHEAD = 100;

export const MAX_FRAGMENT_SIZE = SAFE_OPERATION_SIZE - FRAGMENT_JSON_OVERHEAD;

export const MAX_IMAGE_SIZE = 25 * 1024;

export const HIVE_NODES = [
	'https://api.hive.blog',
	'https://api.deathwing.me'
];
export const AUTH_STORAGE_KEY = 'hive_user';

export const PIXEL_IMAGE_GENESIS_BLOCK = 103547663;

export const HAF_API_ENDPOINT = 'https://api.syncad.com';
export const HAFSQL_API_ENDPOINT = 'https://hafsql-api.mahdiyari.info';
