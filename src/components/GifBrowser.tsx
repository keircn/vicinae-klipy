import { Icon, List, showToast, Toast } from "@vicinae/api";
import { useEffect, useMemo, useState } from "react";
import { pickPreferredVariant, searchGifs, trendingGifs } from "../lib/klipy";
import { getPreferences } from "../lib/preferences";
import type { GifItem } from "../lib/types";
import { GifActions } from "./GifActions";

type BrowserMode = "search" | "trending";

type Props = {
	mode: BrowserMode;
	initialQuery?: string;
};

const formatBytes = (bytes?: number): string | undefined => {
	if (!bytes || bytes <= 0) {
		return undefined;
	}
	if (bytes < 1024) {
		return `${bytes}B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)}KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const createdDate = (timestamp?: number): string | undefined => {
	if (!timestamp) {
		return undefined;
	}
	try {
		return new Date(timestamp * 1000).toLocaleDateString();
	} catch {
		return undefined;
	}
};

const renderDetailMarkdown = (item: GifItem, previewUrl: string): string => {
	const description = item.contentDescription
		? `\n\n${item.contentDescription}`
		: "";
	return `![${item.title}](${previewUrl})\n\n# ${item.title}${description}`;
};

const pickListPreviewUrl = (item: GifItem, fallbackUrl: string): string => {
	const prioritizedKeys = [
		"tinygifpreview",
		"nanogifpreview",
		"gifpreview",
		"tinygif",
		"nanogif",
		"gif",
	];
	for (const key of prioritizedKeys) {
		const variant = item.variants[key];
		if (variant?.preview) {
			return variant.preview;
		}
		if (variant?.url) {
			return variant.url;
		}
	}
	const anyPreview = Object.values(item.variants).find(
		(variant) => variant.preview,
	);
	return anyPreview?.preview ?? fallbackUrl;
};

const pickDetailGifUrl = (item: GifItem, fallbackUrl: string): string => {
	for (const key of ["tinygif", "gif", "nanogif"]) {
		const variant = item.variants[key];
		if (variant?.url) {
			return variant.url;
		}
	}
	return fallbackUrl;
};

export const GifBrowser = ({ mode, initialQuery = "" }: Props) => {
	const prefs = getPreferences();
	const [searchText, setSearchText] = useState(initialQuery);
	const [items, setItems] = useState<GifItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setSearchText(initialQuery);
	}, [initialQuery]);

	const normalizedQuery = searchText.trim();

	useEffect(() => {
		const controller = new AbortController();
		const fetchResults = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const response =
					mode === "trending" || !normalizedQuery
						? await trendingGifs({ signal: controller.signal })
						: await searchGifs({
								query: normalizedQuery,
								limit: prefs.resultLimit,
								signal: controller.signal,
							});
				setItems(response.results);
			} catch (err) {
				if (controller.signal.aborted) {
					return;
				}
				const message =
					err instanceof Error ? err.message : "Unknown API error";
				setError(message);
				setItems([]);
				await showToast({
					style: Toast.Style.Failure,
					title: "Failed to load GIFs",
					message,
				});
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		};

		const debounceMs = mode === "trending" ? 50 : 220;
		const timer = setTimeout(fetchResults, debounceMs);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [mode, normalizedQuery, prefs.resultLimit]);

	const emptyTitle = useMemo(() => {
		if (error) {
			return "Request failed";
		}
		if (mode === "search" && !normalizedQuery) {
			return "Type to search, or browse trending GIFs";
		}
		return "No GIFs found";
	}, [error, mode, normalizedQuery]);

	return (
		<List
			isLoading={isLoading}
			isShowingDetail
			filtering={mode === "trending"}
			throttle
			searchText={searchText}
			onSearchTextChange={setSearchText}
			searchBarPlaceholder={
				mode === "search" ? "Search Klipy GIFs..." : "Filter trending GIFs..."
			}
		>
			{items.length > 0 ? (
				items.map((item) => {
					const preferred = pickPreferredVariant(
						item,
						prefs.defaultMediaFormat,
					);
					const listPreviewUrl = pickListPreviewUrl(item, preferred.url);
					const detailGifUrl = pickDetailGifUrl(item, preferred.url);
					const dims = preferred.dims
						? `${preferred.dims[0]}x${preferred.dims[1]}`
						: undefined;
					return (
						<List.Item
							key={item.id}
							id={item.id}
							title={item.title}
							icon={listPreviewUrl || Icon.Image}
							keywords={[
								...item.tags,
								item.contentDescription ?? "",
								item.title,
							]}
							detail={
								<List.Item.Detail
									markdown={renderDetailMarkdown(item, listPreviewUrl)}
									metadata={
										<List.Item.Detail.Metadata>
											<List.Item.Detail.Metadata.Label
												title="Preview URL"
												text={listPreviewUrl}
											/>
											<List.Item.Detail.Metadata.Label
												title="Animated GIF URL"
												text={detailGifUrl}
											/>
											<List.Item.Detail.Metadata.Label
												title="Preferred format"
												text={prefs.defaultMediaFormat}
											/>
											<List.Item.Detail.Metadata.Label
												title="Dimensions"
												text={dims || "Unknown"}
											/>
											<List.Item.Detail.Metadata.Label
												title="Size"
												text={formatBytes(preferred.size) ?? "Unknown"}
											/>
											<List.Item.Detail.Metadata.Label
												title="Created"
												text={createdDate(item.created) ?? "Unknown"}
											/>
											<List.Item.Detail.Metadata.Label
												title="Page URL"
												text={item.itemUrl ?? item.url}
											/>
										</List.Item.Detail.Metadata>
									}
								/>
							}
							actions={<GifActions item={item} />}
						/>
					);
				})
			) : (
				<List.EmptyView
					title={emptyTitle}
					description={
						error ??
						(mode === "search"
							? "Try a broader query"
							: "No trending GIFs are available right now")
					}
					icon={Icon.Image}
				/>
			)}
		</List>
	);
};
