import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// Frontend dev server on 5173 (default)
	// API calls go to localhost:8000 (teammate's Docker backend)
});
