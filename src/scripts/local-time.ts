import { formatEasternTime } from '../lib/eastern-time';

function renderLocalTime() {
	const el = document.querySelector<HTMLTimeElement>('.hero__local-time');
	if (!el) return;

	const now = new Date();
	el.dateTime = now.toISOString();
	el.textContent = formatEasternTime(now);
}

function msUntilNextMinute() {
	return 60_000 - (Date.now() % 60_000) + 50;
}

renderLocalTime();
window.setTimeout(() => {
	renderLocalTime();
	window.setInterval(renderLocalTime, 60_000);
}, msUntilNextMinute());
