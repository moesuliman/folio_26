import { fetchCurrentListen, getListenKicker, type LatestListen, type ListenStatus } from '../lib/listenbrainz';

const REFRESH_MS = 5 * 60 * 1000;
const CACHE_KEY = 'folio-latest-listen-v3';

type ListenCache = LatestListen & { ts: number };

function isFallbackListen(listen: LatestListen, fallback: string) {
	return listen.label === fallback && !listen.track;
}

function readCache(fallback: string): ListenCache | null {
	try {
		const raw = sessionStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ListenCache;
		if (!parsed?.ts || Date.now() - parsed.ts > REFRESH_MS) return null;
		if (isFallbackListen(parsed, fallback)) return null;
		return parsed;
	} catch {
		return null;
	}
}

function writeCache(listen: LatestListen, fallback: string) {
	if (isFallbackListen(listen, fallback)) return;
	try {
		const payload: ListenCache = { ...listen, ts: Date.now() };
		sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
	} catch {
		// Ignore quota / private mode errors.
	}
}

function listenMatches(a: LatestListen, b: LatestListen) {
	return (
		a.label === b.label &&
		a.track === b.track &&
		a.artist === b.artist &&
		a.album === b.album &&
		a.artUrl === b.artUrl &&
		a.href === b.href &&
		a.status === b.status
	);
}

function preloadArt(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(true);
		img.onerror = () => resolve(false);
		img.src = url;
	});
}

function artUrlMatches(element: HTMLImageElement, artUrl: string) {
	if (element.dataset.artSrc === artUrl) return true;
	return element.src === artUrl || element.src.endsWith(artUrl);
}

function getListenGlyphArt(glyph: HTMLElement | null): HTMLImageElement | null {
	return glyph?.querySelector('img.hero__listen-art') ?? null;
}

function isFallbackListenGlyph(glyph: HTMLElement | null) {
	return Boolean(glyph && !getListenGlyphArt(glyph));
}

function isArtListenGlyph(glyph: HTMLElement | null, artUrl: string) {
	const img = getListenGlyphArt(glyph);
	return img instanceof HTMLImageElement && artUrlMatches(img, artUrl);
}

function createArtGlyph(url: string) {
	const span = document.createElement('span');
	span.className = 'hero__glyph hero__listen-glyph';
	span.setAttribute('aria-hidden', 'true');

	const img = document.createElement('img');
	img.className = 'hero__listen-art';
	img.src = url;
	img.dataset.artSrc = url;
	img.alt = '';
	img.width = 16;
	img.height = 16;
	img.decoding = 'async';
	img.fetchPriority = 'low';
	span.appendChild(img);
	return span;
}

function createFallbackGlyph() {
	const span = document.createElement('span');
	span.className = 'hero__glyph hero__listen-glyph';
	span.setAttribute('aria-hidden', 'true');
	span.textContent = '♪';
	return span;
}

async function updateListenGlyph(container: ParentNode, artUrl: string | null) {
	const existing = container.querySelector<HTMLElement>('.hero__listen-glyph');

	if (!artUrl) {
		if (isFallbackListenGlyph(existing)) return;
		existing?.replaceWith(createFallbackGlyph());
		return;
	}

	if (isArtListenGlyph(existing, artUrl)) return;

	const loaded = await preloadArt(artUrl);
	if (!loaded) {
		if (isFallbackListenGlyph(existing)) return;
		existing?.replaceWith(createFallbackGlyph());
		return;
	}

	const current = container.querySelector<HTMLElement>('.hero__listen-glyph');
	if (isArtListenGlyph(current, artUrl)) return;
	current?.replaceWith(createArtGlyph(artUrl));
}

function setTextContent(el: Element | null, value: string | null) {
	if (!el) return;
	if (value) {
		el.textContent = value;
		el.removeAttribute('hidden');
		return;
	}
	el.textContent = '';
	el.setAttribute('hidden', '');
}

function updatePopoverArt(card: HTMLElement, artUrl: string | null) {
	const existing = card.querySelector<HTMLElement>('.hero__listen-card-art-wrap');
	if (!existing) return;

	if (artUrl) {
		const img = existing.querySelector('img');
		if (img && artUrlMatches(img, artUrl)) return;

		const wrap = document.createElement('div');
		wrap.className = 'hero__listen-card-art-wrap hero__listen-popover-item';

		const nextImg = document.createElement('img');
		nextImg.className = 'hero__listen-card-art';
		nextImg.src = artUrl;
		nextImg.dataset.artSrc = artUrl;
		nextImg.alt = '';
		nextImg.decoding = 'async';
		wrap.appendChild(nextImg);
		existing.replaceWith(wrap);
		return;
	}

	if (existing.classList.contains('hero__listen-card-art-wrap--fallback')) return;

	const wrap = document.createElement('div');
	wrap.className =
		'hero__listen-card-art-wrap hero__listen-card-art-wrap--fallback hero__listen-popover-item';
	wrap.setAttribute('aria-hidden', 'true');

	const span = document.createElement('span');
	span.className = 'hero__listen-card-art hero__listen-card-art--fallback';
	span.textContent = '♪';
	wrap.appendChild(span);
	existing.replaceWith(wrap);
}

function updatePopover(wrap: HTMLElement, listen: LatestListen) {
	const card = wrap.querySelector<HTMLAnchorElement>('.hero__listen-card');
	if (!card) return;

	if (listen.href) card.href = listen.href;
	updatePopoverArt(card, listen.artUrl);
	setTextContent(card.querySelector('.hero__listen-card-kicker'), getListenKicker(listen.status));
	setTextContent(card.querySelector('.hero__listen-card-track'), listen.track ?? listen.label);
	setTextContent(card.querySelector('.hero__listen-card-artist'), listen.artist);
	setTextContent(card.querySelector('.hero__listen-card-album'), listen.album);
}

function applyLatestListen(
	wrap: HTMLElement,
	listen: LatestListen,
	current?: LatestListen,
) {
	if (current && listenMatches(listen, current)) return listen;

	const label = wrap.querySelector('.hero__listen-label');
	if (label && label.textContent !== listen.label) {
		label.textContent = listen.label;
	}

	void updateListenGlyph(wrap, listen.artUrl);
	updatePopover(wrap, listen);
	return listen;
}

function scheduleIdle(task: () => void) {
	if ('requestIdleCallback' in window) {
		requestIdleCallback(task, { timeout: 1500 });
		return;
	}
	setTimeout(task, 1);
}

function initListenPopover(wrap: HTMLElement) {
	const trigger = wrap.querySelector<HTMLButtonElement>('.hero__listen-trigger');
	const popover = wrap.querySelector<HTMLElement>('.hero__listen-popover');
	if (!trigger || !popover) return;

	const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
	let open = false;
	let closeTimer: number | undefined;

	const finishClose = () => {
		popover.setAttribute('hidden', '');
		popover.dataset.open = 'false';
	};

	const setOpen = (next: boolean) => {
		if (next === open) return;
		open = next;
		trigger.setAttribute('aria-expanded', String(next));

		if (next) {
			window.clearTimeout(closeTimer);
			popover.removeAttribute('hidden');
			popover.dataset.open = 'false';
			requestAnimationFrame(() => {
				popover.dataset.open = 'true';
			});
			return;
		}

		popover.dataset.open = 'false';
		window.setTimeout(finishClose, 150);
	};

	const clearCloseTimer = () => {
		window.clearTimeout(closeTimer);
	};

	const scheduleClose = () => {
		clearCloseTimer();
		closeTimer = window.setTimeout(() => setOpen(false), 180);
	};

	trigger.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (finePointer.matches) return;
		setOpen(!open);
	});

	const card = wrap.querySelector<HTMLAnchorElement>('.hero__listen-card');
	card?.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	trigger.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') setOpen(false);
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') setOpen(false);
	});

	document.addEventListener('click', (event) => {
		if (!wrap.contains(event.target as Node)) setOpen(false);
	});

	const bindHover = () => {
		wrap.addEventListener('mouseenter', () => {
			clearCloseTimer();
			setOpen(true);
		});
		wrap.addEventListener('mouseleave', scheduleClose);
	};

	if (finePointer.matches) bindHover();

	finePointer.addEventListener('change', (event) => {
		if (event.matches) bindHover();
	});
}

function initLatestListenRefresh() {
	const wrap = document.querySelector<HTMLElement>('.hero__listen-wrap[data-listenbrainz-user]');
	if (!wrap) return;

	const username = wrap.dataset.listenbrainzUser;
	if (!username) return;

	const fallback = wrap.dataset.fallbackLabel ?? 'Chanel Beads';
	const initialArtUrl = wrap.dataset.initialArtUrl || null;
	const initialStatus = (wrap.dataset.initialStatus as ListenStatus | undefined) ?? 'recent';
	let current: LatestListen = {
		label: wrap.querySelector('.hero__listen-label')?.textContent ?? fallback,
		track: wrap.querySelector('.hero__listen-card-track')?.textContent ?? null,
		artist: wrap.querySelector('.hero__listen-card-artist')?.textContent ?? null,
		album: wrap.querySelector('.hero__listen-card-album')?.textContent ?? null,
		artUrl: initialArtUrl,
		href: wrap.querySelector<HTMLAnchorElement>('.hero__listen-card')?.href ?? null,
		status: initialStatus,
	};
	let inFlight: AbortController | null = null;
	let hasFetched = false;

	initListenPopover(wrap);

	const refresh = async (force = false) => {
		if (!force && hasFetched) {
			const cached = readCache(fallback);
			if (cached) {
				current = applyLatestListen(wrap, cached, current) ?? current;
				return;
			}
		}

		inFlight?.abort();
		const controller = new AbortController();
		inFlight = controller;

		try {
			const listen = await fetchCurrentListen(username, fallback, controller.signal);
			if (controller.signal.aborted) return;

			hasFetched = true;

			if (!isFallbackListen(listen, fallback)) {
				current = applyLatestListen(wrap, listen, current) ?? current;
				writeCache(listen, fallback);
				return;
			}

			// Keep SSR/current data when the API returns the hardcoded fallback.
			if (!current.track) {
				current = applyLatestListen(wrap, listen, current) ?? current;
			}
		} catch {
			if (controller.signal.aborted) return;
		} finally {
			if (inFlight === controller) inFlight = null;
		}
	};

	scheduleIdle(() => {
		void refresh(true);
	});

	setInterval(() => void refresh(true), REFRESH_MS);

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') void refresh(true);
	});
}

initLatestListenRefresh();
