import { Action, ActionPanel, Icon, List, showToast, Toast } from "@vicinae/api";
import { useEffect, useMemo, useState } from "react";
import { GifBrowser } from "./components/GifBrowser";
import { autocompleteTerms, searchSuggestionTerms } from "./lib/klipy";

type SuggestionResult = {
	id: string;
	term: string;
	kind: "autocomplete" | "related";
};

const uniqueTerms = (terms: string[]): string[] => {
	const seen = new Set<string>();
	return terms.filter((term) => {
		const key = term.toLowerCase();
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};

export default function GifSuggestCommand() {
	const [searchText, setSearchText] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [autocomplete, setAutocomplete] = useState<string[]>([]);
	const [related, setRelated] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	const query = searchText.trim();

	useEffect(() => {
		if (!query) {
			setAutocomplete([]);
			setRelated([]);
			setError(null);
			return;
		}

		const controller = new AbortController();
		const loadSuggestions = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const [auto, suggested] = await Promise.all([
					autocompleteTerms({ query, signal: controller.signal }),
					searchSuggestionTerms({ query, signal: controller.signal }),
				]);
				setAutocomplete(uniqueTerms(auto));
				setRelated(uniqueTerms(suggested));
			} catch (err) {
				if (controller.signal.aborted) {
					return;
				}
				const message = err instanceof Error ? err.message : "Unknown API error";
				setError(message);
				await showToast({
					style: Toast.Style.Failure,
					title: "Failed to fetch suggestions",
					message,
				});
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		};

		const timer = setTimeout(loadSuggestions, 220);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [query]);

	const autocompleteItems = useMemo<SuggestionResult[]>(
		() =>
			autocomplete.map((term) => ({
				id: `autocomplete-${term}`,
				term,
				kind: "autocomplete",
			})),
		[autocomplete],
	);

	const relatedItems = useMemo<SuggestionResult[]>(
		() =>
			related.map((term) => ({
				id: `related-${term}`,
				term,
				kind: "related",
			})),
		[related],
	);

	const renderItem = (item: SuggestionResult) => (
		<List.Item
			key={item.id}
			title={item.term}
			accessories={[
				{
					tag: item.kind === "autocomplete" ? "Autocomplete" : "Related",
				},
			]}
			actions={
				<ActionPanel>
					<Action.Push
						title="Search GIFs For Query"
						target={<GifBrowser mode="search" initialQuery={item.term} />}
					/>
					<Action.CopyToClipboard title="Copy Query" content={item.term} />
					<Action.OpenInBrowser
						title="Search on Klipy Website"
						url={`https://klipy.com/search/${encodeURIComponent(item.term)}`}
					/>
				</ActionPanel>
			}
		/>
	);

	return (
		<List
			isLoading={isLoading}
			throttle
			searchText={searchText}
			onSearchTextChange={setSearchText}
			searchBarPlaceholder="Type a topic for suggestion ideas..."
		>
			{query ? (
				autocompleteItems.length || relatedItems.length ? (
					<>
						<List.Section title="Autocomplete">
							{autocompleteItems.map(renderItem)}
						</List.Section>
						<List.Section title="Related Suggestions">
							{relatedItems.map(renderItem)}
						</List.Section>
					</>
				) : (
					<List.EmptyView
						title="No suggestions found"
						description={error ?? "Try another keyword"}
						icon={Icon.LightBulb}
					/>
				)
			) : (
				<List.EmptyView
					title="Type a query to get suggestions"
					description="Use suggestions to quickly jump into GIF search"
					icon={Icon.MagnifyingGlass}
				/>
			)}
		</List>
	);
}
