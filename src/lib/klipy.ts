import { getPreferences } from "./preferences";
import type { GifItem, GifVariant, SearchResponse } from "./types";

type QueryValue = string | number | boolean | undefined;

type RequestOptions = {
	signal?: AbortSignal;
	ttlMs?: number;
};

type SearchOptions = {
	query: string;
	limit?: number;
	pos?: string;
	signal?: AbortSignal;
};

type SuggestOptions = {
	query: string;
	limit?: number;
	signal?: AbortSignal;
};

type CacheEntry = {
	expiresAt: number;
	value: unknown;
};

const cache = new Map<string, CacheEntry>();

const withDefaultParams = (
	params: Record<string, QueryValue>,
): Record<string, QueryValue> => {
	const prefs = getPreferences();
	if (!prefs.apiKey?.trim()) {
		throw new Error("Missing Klipy API key. Set it in extension preferences.");
	}
	return {
		...params,
		key: prefs.apiKey,
		client_key: prefs.clientKey,
		media_filter: prefs.mediaFilter,
		contentfilter: prefs.contentFilter,
		country: prefs.country,
		locale: prefs.locale,
	};
};

const makeUrl = (path: string, params: Record<string, QueryValue>): string => {
	const prefs = getPreferences();
	const url = new URL(`${prefs.apiBaseUrl}${path}`);
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === "") {
			continue;
		}
		url.searchParams.set(key, String(value));
	}
	return url.toString();
};

const fetchJson = async <T>(
	path: string,
	params: Record<string, QueryValue>,
	{ signal, ttlMs = 20_000 }: RequestOptions = {},
): Promise<T> => {
	const cacheKey = `${path}:${JSON.stringify(params)}`;
	const now = Date.now();
	const cached = cache.get(cacheKey);
	if (cached && cached.expiresAt > now) {
		return cached.value as T;
	}

	const url = makeUrl(path, withDefaultParams(params));
	const response = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
		signal,
	});

	if (!response.ok) {
		const details = await response.text();
		throw new Error(
			`Klipy API request failed (${response.status}): ${details.slice(0, 220)}`,
		);
	}

	const data = (await response.json()) as T;
	cache.set(cacheKey, { value: data, expiresAt: now + ttlMs });
	return data;
};

const parseVariant = (value: unknown): GifVariant | undefined => {
	if (!value || typeof value !== "object") {
		return undefined;
	}
	const raw = value as {
		url?: string;
		dims?: unknown;
		size?: unknown;
		duration?: unknown;
		preview?: unknown;
	};

	if (!raw.url) {
		return undefined;
	}

	let dims: [number, number] | undefined;
	if (Array.isArray(raw.dims) && raw.dims.length === 2) {
		const width = Number(raw.dims[0]);
		const height = Number(raw.dims[1]);
		if (Number.isFinite(width) && Number.isFinite(height)) {
			dims = [width, height];
		}
	}

	return {
		url: raw.url,
		dims,
		size:
			raw.size !== undefined && Number.isFinite(Number(raw.size))
				? Number(raw.size)
				: undefined,
		duration:
			raw.duration !== undefined && Number.isFinite(Number(raw.duration))
				? Number(raw.duration)
				: undefined,
		preview: typeof raw.preview === "string" ? raw.preview : undefined,
	};
};

const parseVariants = (item: Record<string, unknown>): Record<string, GifVariant> => {
	const out: Record<string, GifVariant> = {};
	const mediaFormats =
		(item.media_formats as Record<string, unknown> | undefined) ??
		(item.media as Record<string, unknown> | undefined);

	if (mediaFormats && typeof mediaFormats === "object") {
		for (const [key, value] of Object.entries(mediaFormats)) {
			const parsed = parseVariant(value);
			if (parsed) {
				out[key] = parsed;
			}
		}
	}

	if (typeof item.url === "string" && !out.gif) {
		out.gif = { url: item.url };
	}

	return out;
};

const parseGifItem = (item: unknown): GifItem | undefined => {
	if (!item || typeof item !== "object") {
		return undefined;
	}

	const raw = item as Record<string, unknown>;
	const id =
		(typeof raw.id === "string" && raw.id) ||
		(typeof raw.url === "string" && raw.url) ||
		(typeof raw.itemurl === "string" && raw.itemurl);
	if (!id) {
		return undefined;
	}

	const variants = parseVariants(raw);
	const fallbackUrl =
		variants.gif?.url ??
		Object.values(variants)[0]?.url ??
		(typeof raw.url === "string" ? raw.url : undefined);
	if (!fallbackUrl) {
		return undefined;
	}

	return {
		id,
		title:
			(typeof raw.title === "string" && raw.title) ||
			(typeof raw.content_description === "string" && raw.content_description) ||
			"Untitled GIF",
		url: fallbackUrl,
		itemUrl: typeof raw.itemurl === "string" ? raw.itemurl : undefined,
		contentDescription:
			typeof raw.content_description === "string"
				? raw.content_description
				: undefined,
		created:
			raw.created !== undefined && Number.isFinite(Number(raw.created))
				? Number(raw.created)
				: undefined,
		tags: Array.isArray(raw.tags)
			? raw.tags.filter((value): value is string => typeof value === "string")
			: [],
		variants,
	};
};

const parseSearchPayload = (payload: unknown): SearchResponse => {
	if (!payload || typeof payload !== "object") {
		return { results: [] };
	}
	const raw = payload as { results?: unknown; next?: unknown };
	const results = Array.isArray(raw.results)
		? raw.results
				.map(parseGifItem)
				.filter((value): value is GifItem => value !== undefined)
		: [];
	return {
		results,
		next: typeof raw.next === "string" ? raw.next : undefined,
	};
};

const parseTerms = (payload: unknown): string[] => {
	if (!payload || typeof payload !== "object") {
		return [];
	}
	const raw = payload as { results?: unknown };
	if (!Array.isArray(raw.results)) {
		return [];
	}

	return raw.results
		.map((value) => {
			if (typeof value === "string") {
				return value;
			}
			if (!value || typeof value !== "object") {
				return undefined;
			}
			const typedValue = value as { term?: unknown; searchterm?: unknown; name?: unknown };
			if (typeof typedValue.term === "string") {
				return typedValue.term;
			}
			if (typeof typedValue.searchterm === "string") {
				return typedValue.searchterm;
			}
			if (typeof typedValue.name === "string") {
				return typedValue.name;
			}
			return undefined;
		})
		.filter((term): term is string => Boolean(term?.trim()));
};

export const pickPreferredVariant = (
	item: GifItem,
	preferredKey: string,
): GifVariant => {
	return (
		item.variants[preferredKey] ??
		item.variants.gif ??
		item.variants.tinygif ??
		item.variants.mp4 ??
		Object.values(item.variants)[0] ?? { url: item.url }
	);
};

export const searchGifs = async ({
	query,
	limit,
	pos,
	signal,
}: SearchOptions): Promise<SearchResponse> => {
	const prefs = getPreferences();
	const payload = await fetchJson<unknown>(
		"/v2/search",
		{
			q: query,
			limit: limit ?? prefs.resultLimit,
			pos,
		},
		{ signal },
	);
	return parseSearchPayload(payload);
};

export const trendingGifs = async ({
	limit,
	pos,
	signal,
}: {
	limit?: number;
	pos?: string;
	signal?: AbortSignal;
} = {}): Promise<SearchResponse> => {
	const prefs = getPreferences();
	const payload = await fetchJson<unknown>(
		"/v2/featured",
		{
			limit: limit ?? prefs.resultLimit,
			pos,
		},
		{ signal },
	);
	return parseSearchPayload(payload);
};

export const autocompleteTerms = async ({
	query,
	limit = 12,
	signal,
}: SuggestOptions): Promise<string[]> => {
	const payload = await fetchJson<unknown>(
		"/v2/autocomplete",
		{
			q: query,
			limit,
		},
		{ signal, ttlMs: 60_000 },
	);
	return parseTerms(payload);
};

export const searchSuggestionTerms = async ({
	query,
	limit = 12,
	signal,
}: SuggestOptions): Promise<string[]> => {
	const payload = await fetchJson<unknown>(
		"/v2/search_suggestions",
		{
			q: query,
			limit,
		},
		{ signal, ttlMs: 60_000 },
	);
	return parseTerms(payload);
};
