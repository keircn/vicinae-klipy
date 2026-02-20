import { Clipboard, open, showHUD } from "@vicinae/api";
import { pickPreferredVariant } from "./klipy";
import { getPreferences } from "./preferences";
import type { GifItem } from "./types";

export const runDefaultAction = async (item: GifItem): Promise<void> => {
	const prefs = getPreferences();
	const variant = pickPreferredVariant(item, prefs.defaultMediaFormat);
	const target = variant.url;

	if (prefs.defaultAction === "copy") {
		await Clipboard.copy(target);
		await showHUD(`Copied GIF URL: ${item.title}`);
		return;
	}

	if (prefs.defaultAction === "browser") {
		await open(item.itemUrl ?? target);
		await showHUD(`Opened in browser: ${item.title}`);
		return;
	}

	await open(target, prefs.openWithApp);
	await showHUD(`Opened GIF: ${item.title}`);
};
