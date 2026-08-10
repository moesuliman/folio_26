import type { ImageMetadata } from 'astro';

const projectImages = import.meta.glob<{ default: ImageMetadata }>(
	'/src/content/projects/**/images/*.{jpg,jpeg,png,webp,avif,gif}',
	{ eager: true },
);

export function getProjectImages(category: string, slug: string): ImageMetadata[] {
	const prefix = `/src/content/projects/${category}/${slug}/images/`;

	return Object.entries(projectImages)
		.filter(([path]) => path.startsWith(prefix))
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([, mod]) => mod.default);
}
