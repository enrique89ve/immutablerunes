import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/__tests__/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/protocol/**/*.ts'],
			exclude: ['src/**/__tests__/**']
		}
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, './src')
		}
	}
});
