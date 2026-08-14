export const PRIMARY_TAGS = [
	'Product',
	'Brand',
	'Ecommerce',
	'Marketing',
	'Illustration',
	'Art',
	'3D',
	'Touch Designer',
	'Photography',
] as const;

export const SECONDARY_TAGS = ['Music', 'Fashion', 'Furniture', 'Art Direction', 'Sport', 'Visual'] as const;

export const PROJECT_TAGS = [...PRIMARY_TAGS, ...SECONDARY_TAGS] as const;

export type ProjectTag = (typeof PROJECT_TAGS)[number];

export function displayTags(tags: readonly string[] | undefined, limit?: number): string[] {
	const list = tags ?? [];
	if (limit === undefined) return [...list];
	return list.slice(0, limit);
}
