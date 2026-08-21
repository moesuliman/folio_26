const RELATED_LIMIT = 3;

export type RelatedProjectLike = {
	id: string;
	data: {
		category: string;
		tags: readonly string[];
		order: number;
		hidden?: boolean;
		cover?: unknown;
	};
};

function capitalizeCategory(category: string): string {
	if (!category) return category;
	return category.charAt(0).toUpperCase() + category.slice(1);
}

export function scoreRelatedProject(
	current: RelatedProjectLike,
	candidate: RelatedProjectLike,
): number {
	let score = 0;

	if (candidate.data.category === current.data.category) {
		score += 4;
	}

	const currentTags = new Set(current.data.tags);
	for (const tag of candidate.data.tags) {
		if (currentTags.has(tag)) score += 2;
	}

	score += Math.max(0, 3 - Math.abs(current.data.order - candidate.data.order) / 5);

	return score;
}

function compareByOrderThenId(a: RelatedProjectLike, b: RelatedProjectLike): number {
	const orderDiff = a.data.order - b.data.order;
	if (orderDiff !== 0) return orderDiff;
	return a.id.localeCompare(b.id);
}

/** Up to `limit` related projects: scored matches first, then order-based fill. */
export function getRelatedProjects<T extends RelatedProjectLike>(
	current: T,
	all: readonly T[],
	limit = RELATED_LIMIT,
): T[] {
	const visible = all.filter((project) => project.id !== current.id && !project.data.hidden);
	const withCover = visible.filter((project) => Boolean(project.data.cover));
	const pool = withCover.length > 0 ? withCover : visible;

	const scored = pool
		.map((project) => ({ project, score: scoreRelatedProject(current, project) }))
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return compareByOrderThenId(a.project, b.project);
		});

	const picked: T[] = [];
	const pickedIds = new Set<string>();

	for (const item of scored) {
		if (item.score <= 0 || picked.length >= limit) continue;
		picked.push(item.project);
		pickedIds.add(item.project.id);
	}

	if (picked.length < limit) {
		const fillers = pool.filter((project) => !pickedIds.has(project.id)).sort(compareByOrderThenId);

		for (const project of fillers) {
			if (picked.length >= limit) break;
			picked.push(project);
		}
	}

	return picked;
}

export function relatedProjectsHeading(
	current: RelatedProjectLike,
	related: readonly RelatedProjectLike[],
): string {
	const sameCategory =
		related.length > 0 && related.every((project) => project.data.category === current.data.category);

	return sameCategory ? `More ${capitalizeCategory(current.data.category)}` : 'More work';
}
