const projectVideoUrls = import.meta.glob<string>(
	'/src/content/projects/**/images/*.{mp4,webm}',
	{ query: '?url', import: 'default', eager: true },
);

export function getProjectVideoUrl(
	category: string,
	slug: string,
	relativePath: string,
): string {
	const normalized = relativePath.replace(/^\.\//, '');
	const key = `/src/content/projects/${category}/${slug}/${normalized}`;
	const url = projectVideoUrls[key];

	if (!url) {
		throw new Error(`Project video not found: ${key}`);
	}

	return url;
}
