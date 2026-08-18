const API_BASE = 'https://api.listenbrainz.org/1';
const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'folio_26/1.0 (https://moesuliman.github.io/folio_26)';
const FALLBACK_LABEL = 'Chanel Beads';

type MbidMapping = {
	caa_id?: number;
	caa_release_mbid?: string;
	release_mbid?: string;
	recording_mbid?: string;
};

type TrackMetadata = {
	artist_name?: string;
	track_name?: string;
	release_name?: string;
	mbid_mapping?: MbidMapping;
};

type ListensResponse = {
	payload?: {
		playing_now?: boolean;
		listens?: Array<{
			playing_now?: boolean;
			track_metadata?: TrackMetadata;
		}>;
	};
};

type MusicBrainzRelease = {
	id?: string;
	title?: string;
};

type MusicBrainzRecording = {
	id?: string;
	title?: string;
	releases?: MusicBrainzRelease[];
};

type ResolvedCover = {
	artUrl: string | null;
	recordingMbid: string | null;
	releaseMbid: string | null;
};

export type ListenStatus = 'playing' | 'recent';

export type LatestListen = {
	label: string;
	track: string | null;
	artist: string | null;
	album: string | null;
	artUrl: string | null;
	href: string | null;
	status: ListenStatus;
};

export const FALLBACK_LISTEN: LatestListen = {
	label: FALLBACK_LABEL,
	track: null,
	artist: null,
	album: null,
	artUrl: null,
	href: null,
	status: 'recent',
};

const coverLookupCache = new Map<string, ResolvedCover | null>();

export function getListenKicker(status: ListenStatus): string {
	return status === 'playing' ? 'Currently playing' : 'Recently played';
}

/** Smallest available cover art URL, preferring a direct archive.org thumbnail. */
export function getCoverArtUrl(mapping: MbidMapping | undefined): string | null {
	if (mapping?.caa_release_mbid && mapping.caa_id) {
		const mbid = mapping.caa_release_mbid;
		return `https://archive.org/download/mbid-${mbid}/mbid-${mbid}-${mapping.caa_id}_thumb250.jpg`;
	}
	if (mapping?.release_mbid) {
		return `https://coverartarchive.org/release/${mapping.release_mbid}/front-250`;
	}
	return null;
}

function coverArtFromRelease(releaseMbid: string): string {
	return `https://coverartarchive.org/release/${releaseMbid}/front-250`;
}

function escapeMusicBrainzQuery(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function coverLookupKey(meta: TrackMetadata): string {
	return [meta.artist_name, meta.track_name, meta.release_name]
		.map((part) => part?.trim().toLowerCase() ?? '')
		.join('|');
}

function pickRelease(
	releases: MusicBrainzRelease[] | undefined,
	album: string | undefined,
): MusicBrainzRelease | null {
	if (!releases?.length) return null;

	if (album?.trim()) {
		const normalizedAlbum = album.trim().toLowerCase();
		const match = releases.find(
			(release) => release.title?.trim().toLowerCase() === normalizedAlbum,
		);
		if (match?.id) return match;
	}

	return releases.find((release) => release.id) ?? null;
}

async function lookupCoverArt(
	meta: TrackMetadata,
	signal?: AbortSignal,
): Promise<ResolvedCover | null> {
	const cacheKey = coverLookupKey(meta);
	if (coverLookupCache.has(cacheKey)) {
		return coverLookupCache.get(cacheKey) ?? null;
	}

	const track = meta.track_name?.trim();
	const artist = meta.artist_name?.trim();
	const album = meta.release_name?.trim();
	if (!track || !artist) {
		coverLookupCache.set(cacheKey, null);
		return null;
	}

	const queryParts = [
		`recording:"${escapeMusicBrainzQuery(track)}"`,
		`artist:"${escapeMusicBrainzQuery(artist)}"`,
	];
	if (album) queryParts.push(`release:"${escapeMusicBrainzQuery(album)}"`);

	const url = `${MUSICBRAINZ_BASE}/recording?query=${encodeURIComponent(queryParts.join(' AND '))}&fmt=json&limit=1`;

	try {
		const res = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': USER_AGENT,
			},
			signal,
		});
		if (!res.ok) {
			coverLookupCache.set(cacheKey, null);
			return null;
		}

		const data = (await res.json()) as { recordings?: MusicBrainzRecording[] };
		const recording = data.recordings?.[0];
		if (!recording?.id) {
			coverLookupCache.set(cacheKey, null);
			return null;
		}

		const release = pickRelease(recording.releases, album);
		const resolved: ResolvedCover = {
			recordingMbid: recording.id,
			releaseMbid: release?.id ?? null,
			artUrl: release?.id ? coverArtFromRelease(release.id) : null,
		};

		coverLookupCache.set(cacheKey, resolved);
		return resolved;
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') throw error;
		coverLookupCache.set(cacheKey, null);
		return null;
	}
}

/** MusicBrainz link for the matched recording, with sensible fallbacks. */
export function getListenHref(
	meta: TrackMetadata | undefined,
	username?: string,
	recordingMbid?: string | null,
): string | null {
	if (recordingMbid) {
		return `https://musicbrainz.org/recording/${recordingMbid}`;
	}

	const mapping = meta?.mbid_mapping;

	if (mapping?.recording_mbid) {
		return `https://musicbrainz.org/recording/${mapping.recording_mbid}`;
	}
	if (mapping?.release_mbid) {
		return `https://musicbrainz.org/release/${mapping.release_mbid}`;
	}
	if (username?.trim()) {
		return `https://listenbrainz.org/user/${encodeURIComponent(username.trim())}`;
	}
	return null;
}

/** Format as "Song title - Artist", omitting missing parts. */
export function formatListenLabel(meta: TrackMetadata | undefined): string | null {
	if (!meta) return null;

	const track = meta.track_name?.trim();
	const artist = meta.artist_name?.trim();
	const album = meta.release_name?.trim();

	if (track && artist) return `${track} - ${artist}`;
	return track || artist || album || null;
}

function parseTrackMetadata(
	meta: TrackMetadata | undefined,
	fallback: string,
	username: string | undefined,
	status: ListenStatus,
	recordingMbid?: string | null,
): LatestListen {
	return {
		label: formatListenLabel(meta) ?? fallback,
		track: meta?.track_name?.trim() ?? null,
		artist: meta?.artist_name?.trim() ?? null,
		album: meta?.release_name?.trim() ?? null,
		artUrl: getCoverArtUrl(meta?.mbid_mapping),
		href: getListenHref(meta, username, recordingMbid),
		status,
	};
}

async function buildListen(
	meta: TrackMetadata | undefined,
	fallback: string,
	username: string,
	status: ListenStatus,
	signal?: AbortSignal,
): Promise<LatestListen> {
	if (!meta) return { ...FALLBACK_LISTEN, label: fallback, status };

	const mappedArtUrl = getCoverArtUrl(meta.mbid_mapping);
	const mappedRecordingMbid = meta.mbid_mapping?.recording_mbid ?? null;

	if (mappedArtUrl) {
		return parseTrackMetadata(meta, fallback, username, status, mappedRecordingMbid);
	}

	const resolved = await lookupCoverArt(meta, signal);
	return {
		...parseTrackMetadata(
			meta,
			fallback,
			username,
			status,
			resolved?.recordingMbid ?? mappedRecordingMbid,
		),
		artUrl: resolved?.artUrl ?? mappedArtUrl,
	};
}

function hasActivePlayingNow(data: ListensResponse): boolean {
	const listen = data.payload?.listens?.[0];
	if (!listen?.track_metadata) return false;
	return data.payload?.playing_now === true || listen.playing_now === true;
}

/** Parse the most recent scrobble from a ListenBrainz listens response. */
export function parseLatestListen(
	data: ListensResponse,
	fallback = FALLBACK_LABEL,
	username?: string,
): LatestListen {
	return parseTrackMetadata(
		data.payload?.listens?.[0]?.track_metadata,
		fallback,
		username,
		'recent',
	);
}

async function fetchPlayingNow(
	username: string,
	signal?: AbortSignal,
): Promise<TrackMetadata | null> {
	const url = `${API_BASE}/user/${encodeURIComponent(username)}/playing-now`;
	const res = await fetch(url, {
		headers: { Accept: 'application/json' },
		signal,
	});
	if (!res.ok) return null;

	const data = (await res.json()) as ListensResponse;
	if (!hasActivePlayingNow(data)) return null;
	return data.payload?.listens?.[0]?.track_metadata ?? null;
}

async function fetchLatestScrobble(
	username: string,
	signal?: AbortSignal,
): Promise<TrackMetadata | null> {
	const url = `${API_BASE}/user/${encodeURIComponent(username)}/listens?count=1`;
	const res = await fetch(url, {
		headers: { Accept: 'application/json' },
		signal,
	});
	if (!res.ok) return null;

	const data = (await res.json()) as ListensResponse;
	return data.payload?.listens?.[0]?.track_metadata ?? null;
}

/**
 * Prefer the live playing-now track; fall back to the most recent scrobble.
 * Works in Node and the browser.
 */
export async function fetchCurrentListen(
	username: string,
	fallback = FALLBACK_LABEL,
	signal?: AbortSignal,
): Promise<LatestListen> {
	const trimmed = username.trim();
	if (!trimmed) return { ...FALLBACK_LISTEN, label: fallback };

	try {
		const playingMeta = await fetchPlayingNow(trimmed, signal);
		if (playingMeta) {
			return buildListen(playingMeta, fallback, trimmed, 'playing', signal);
		}

		const recentMeta = await fetchLatestScrobble(trimmed, signal);
		if (recentMeta) {
			return buildListen(recentMeta, fallback, trimmed, 'recent', signal);
		}

		return { ...FALLBACK_LISTEN, label: fallback };
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') throw error;
		return { ...FALLBACK_LISTEN, label: fallback };
	}
}

/** @deprecated Use fetchCurrentListen */
export const fetchLatestListen = fetchCurrentListen;

/**
 * Fetch the current or most recent ListenBrainz listen at build time.
 * Reading public listens needs only a username (no token).
 */
export async function getLatestListen(
	username = import.meta.env.LISTENBRAINZ_USERNAME as string | undefined,
	fallback = FALLBACK_LABEL,
): Promise<LatestListen> {
	if (!username?.trim()) return { ...FALLBACK_LISTEN, label: fallback };
	return fetchCurrentListen(username, fallback);
}

export async function getLatestListenLabel(
	username = import.meta.env.LISTENBRAINZ_USERNAME as string | undefined,
	fallback = FALLBACK_LABEL,
): Promise<string> {
	return (await getLatestListen(username, fallback)).label;
}
