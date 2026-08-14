const API_BASE = 'https://api.listenbrainz.org/1';
const FALLBACK_LABEL = 'Chanel Beads';

type TrackMetadata = {
	artist_name?: string;
	track_name?: string;
	release_name?: string;
};

type ListensResponse = {
	payload?: {
		listens?: Array<{
			track_metadata?: TrackMetadata;
		}>;
	};
};

/** Format as "Song title - Artist", omitting missing parts. */
export function formatListenLabel(meta: TrackMetadata | undefined): string | null {
	if (!meta) return null;

	const track = meta.track_name?.trim();
	const artist = meta.artist_name?.trim();
	const album = meta.release_name?.trim();

	if (track && artist) return `${track} - ${artist}`;
	return track || artist || album || null;
}

/**
 * Fetch the most recent ListenBrainz listen for a user at build time.
 * Reading public listens needs only a username (no token).
 */
export async function getLatestListenLabel(
	username = import.meta.env.LISTENBRAINZ_USERNAME as string | undefined,
	fallback = FALLBACK_LABEL,
): Promise<string> {
	if (!username?.trim()) return fallback;

	try {
		const url = `${API_BASE}/user/${encodeURIComponent(username.trim())}/listens?count=1`;
		const res = await fetch(url, {
			headers: { Accept: 'application/json' },
		});
		if (!res.ok) return fallback;

		const data = (await res.json()) as ListensResponse;
		const label = formatListenLabel(data.payload?.listens?.[0]?.track_metadata);
		return label ?? fallback;
	} catch {
		return fallback;
	}
}
