const EXIT_MS = 150;
const ENTER_MS = 220;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let generation = 0;

function prefersReducedMotion() {
	return reducedMotion.matches;
}

function clearTransient(item: HTMLElement) {
	item.classList.remove(
		'work-item--exit',
		'work-item--enter',
		'work-item--overlay',
		'work-item--animate',
	);
	item.style.left = '';
	item.style.top = '';
	item.style.width = '';
}

function matchesFilter(item: HTMLElement, filter: string) {
	return filter === 'all' || item.dataset.category === filter;
}

function movedFrom(prev: DOMRect, next: DOMRect) {
	return Math.abs(prev.top - next.top) > 1 || Math.abs(prev.left - next.left) > 1;
}

function syncIndicator(tabs: HTMLElement, active: HTMLButtonElement) {
	const label = active.querySelector('span') ?? active;
	const tabsRect = tabs.getBoundingClientRect();
	const labelRect = label.getBoundingClientRect();
	tabs.style.setProperty('--ink-x', `${labelRect.left - tabsRect.left}px`);
	tabs.style.setProperty('--ink-width', `${labelRect.width}px`);
}

function applyFilter(
	grid: HTMLElement,
	items: HTMLElement[],
	filter: string,
) {
	const gen = ++generation;

	if (prefersReducedMotion()) {
		items.forEach((item) => {
			clearTransient(item);
			item.hidden = !matchesFilter(item, filter);
		});
		return;
	}

	const first = new Map<HTMLElement, DOMRect>();
	items.forEach((item) => {
		if (!item.hidden) first.set(item, item.getBoundingClientRect());
	});

	items.forEach((item) => clearTransient(item));

	const leaving = items.filter((item) => first.has(item) && !matchesFilter(item, filter));
	const entering = items.filter((item) => !first.has(item) && matchesFilter(item, filter));
	const staying = items.filter((item) => first.has(item) && matchesFilter(item, filter));

	const gridRect = grid.getBoundingClientRect();

	leaving.forEach((item) => {
		const rect = first.get(item);
		if (!rect) return;
		item.classList.add('work-item--overlay');
		item.style.left = `${rect.left - gridRect.left}px`;
		item.style.top = `${rect.top - gridRect.top + grid.scrollTop}px`;
		item.style.width = `${rect.width}px`;
	});

	entering.forEach((item) => {
		item.hidden = false;
		item.classList.add('work-item--enter');
	});

	const appearing = [...entering];
	staying.forEach((item) => {
		const prev = first.get(item);
		if (!prev) return;
		if (!movedFrom(prev, item.getBoundingClientRect())) return;
		item.classList.add('work-item--enter');
		appearing.push(item);
	});

	grid.getBoundingClientRect();

	leaving.forEach((item) => item.classList.add('work-item--animate', 'work-item--exit'));
	appearing.forEach((item) => {
		item.classList.add('work-item--animate');
		item.classList.remove('work-item--enter');
	});

	window.setTimeout(() => {
		if (gen !== generation) return;
		leaving.forEach((item) => {
			item.hidden = true;
			clearTransient(item);
		});
		appearing.forEach((item) => item.classList.remove('work-item--animate'));
	}, Math.max(EXIT_MS, ENTER_MS) + 20);
}

function initWorkBoard() {
	const tabs = document.querySelector<HTMLElement>('.work-board .filters--heading');
	const grid = document.querySelector<HTMLElement>('.work-board .project-grid');
	if (!tabs || !grid) return;

	const buttons = [...tabs.querySelectorAll<HTMLButtonElement>('button[data-filter]')];
	const items = [...grid.querySelectorAll<HTMLElement>('.work-item')];
	if (buttons.length === 0) return;

	const active =
		buttons.find((button) => button.getAttribute('aria-pressed') === 'true') ?? buttons[0];
	syncIndicator(tabs, active);
	requestAnimationFrame(() => {
		syncIndicator(tabs, active);
		tabs.classList.add('is-ready');
	});

	const activeButton = () =>
		buttons.find((button) => button.getAttribute('aria-pressed') === 'true') ?? buttons[0];

	buttons.forEach((button) => {
		button.addEventListener('click', () => {
			if (button.getAttribute('aria-pressed') === 'true') return;

			buttons.forEach((other) => {
				other.setAttribute('aria-pressed', String(other === button));
			});
			syncIndicator(tabs, button);
			applyFilter(grid, items, button.dataset.filter ?? 'all');
		});
	});

	window.addEventListener('resize', () => {
		tabs.classList.remove('is-ready');
		syncIndicator(tabs, activeButton());
		requestAnimationFrame(() => tabs.classList.add('is-ready'));
	});
}

initWorkBoard();
