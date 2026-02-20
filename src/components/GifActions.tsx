import { Action, ActionPanel, Icon } from "@vicinae/api";
import { getPreferences } from "../lib/preferences";
import { pickPreferredVariant } from "../lib/klipy";
import type { GifItem } from "../lib/types";

type Props = {
	item: GifItem;
};

const buildMarkdown = (item: GifItem, gifUrl: string): string => {
	const alt = item.title.replaceAll("[", "").replaceAll("]", "");
	return `![${alt}](${gifUrl})`;
};

export const GifActions = ({ item }: Props) => {
	const prefs = getPreferences();
	const preferred = pickPreferredVariant(item, prefs.defaultMediaFormat);
	const gifUrl = preferred.url;
	const pageUrl = item.itemUrl ?? item.url;

	const defaultAction =
		prefs.defaultAction === "open" ? (
			<Action.Open
				title="Open GIF In App"
				target={gifUrl}
				app={prefs.openWithApp}
				icon={Icon.AppWindow}
			/>
		) : prefs.defaultAction === "browser" ? (
			<Action.OpenInBrowser
				title="Open GIF In Browser"
				url={gifUrl}
				icon={Icon.Globe}
			/>
		) : (
			<Action.CopyToClipboard
				title="Copy GIF URL"
				content={gifUrl}
				icon={Icon.CopyClipboard}
			/>
		);

	return (
		<ActionPanel>
			{defaultAction}
			<Action.CopyToClipboard
				title="Copy Klipy Page URL"
				content={pageUrl}
				icon={Icon.Link}
			/>
			<Action.CopyToClipboard
				title="Copy Markdown Embed"
				content={buildMarkdown(item, gifUrl)}
				icon={Icon.Code}
			/>
			<Action.CopyToClipboard
				title="Copy HTML Embed"
				content={`<img src="${gifUrl}" alt="${item.title}" />`}
				icon={Icon.CodeBlock}
			/>
			<ActionPanel.Section title="Open">
				<Action.OpenInBrowser
					title="Open Result Page"
					url={pageUrl}
					icon={Icon.Globe}
				/>
				<Action.Open
					title="Open GIF In App"
					target={gifUrl}
					app={prefs.openWithApp}
				/>
			</ActionPanel.Section>
			<ActionPanel.Submenu title="Use Alternate Format" icon={Icon.Swatch}>
				{Object.entries(item.variants).map(([format, variant]) => (
					<Action.CopyToClipboard
						key={`copy-${item.id}-${format}`}
						title={`Copy ${format.toUpperCase()} URL`}
						content={variant.url}
					/>
				))}
				<ActionPanel.Section title="Open Format">
					{Object.entries(item.variants).map(([format, variant]) => (
						<Action.OpenInBrowser
							key={`open-${item.id}-${format}`}
							title={`Open ${format.toUpperCase()}`}
							url={variant.url}
						/>
					))}
				</ActionPanel.Section>
			</ActionPanel.Submenu>
		</ActionPanel>
	);
};
