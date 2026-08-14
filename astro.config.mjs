// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	// Set ASTRO_BASE=/folio_26 and SITE_URL in CI for GitHub Pages; local dev uses /.
	site: process.env.SITE_URL,
	base: process.env.ASTRO_BASE ?? '/',
	output: 'static',
	integrations: [mdx()],
});
