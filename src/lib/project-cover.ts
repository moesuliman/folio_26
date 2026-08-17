import type { CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { getProjectVideoUrl } from './project-videos';

export function getProjectCover(project: CollectionEntry<'projects'>): {
	cover?: ImageMetadata;
	coverVideo?: string;
} {
	return {
		cover: project.data.cover,
		coverVideo: project.data.coverVideo
			? getProjectVideoUrl(project.data.category, project.id, project.data.coverVideo)
			: undefined,
	};
}
