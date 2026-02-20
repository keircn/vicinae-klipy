export type GifVariant = {
	url: string;
	dims?: [number, number];
	size?: number;
	duration?: number;
	preview?: string;
};

export type GifItem = {
	id: string;
	title: string;
	url: string;
	itemUrl?: string;
	contentDescription?: string;
	created?: number;
	tags: string[];
	variants: Record<string, GifVariant>;
};

export type SearchResponse = {
	results: GifItem[];
	next?: string;
};
