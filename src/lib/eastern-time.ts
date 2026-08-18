export const EASTERN_TZ = 'America/New_York';

export function formatEasternTime(date = new Date()) {
	const time = new Intl.DateTimeFormat('en-US', {
		timeZone: EASTERN_TZ,
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	}).format(date);

	return `${time} EST`;
}
