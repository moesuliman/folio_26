/** Prefix an app path with the configured Astro base URL. */
export function withBase(path: string): string {
	const base = import.meta.env.BASE_URL;
	const root = base.endsWith('/') ? base : `${base}/`;
	const normalized = path.startsWith('/') ? path.slice(1) : path;
	return `${root}${normalized}`;
}

/** Strip the configured base URL from a pathname. */
export function stripBase(pathname: string): string {
	const base = import.meta.env.BASE_URL;
	const root = base.endsWith('/') ? base : `${base}/`;
	if (pathname === base || pathname === root) return '/';
	if (pathname.startsWith(root)) return `/${pathname.slice(root.length)}`;
	return pathname;
}
