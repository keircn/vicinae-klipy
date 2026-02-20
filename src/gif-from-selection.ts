import {
	closeMainWindow,
	getSelectedText,
	showToast,
	Toast,
} from "@vicinae/api";
import { runDefaultAction } from "./lib/actions";
import { searchGifs } from "./lib/klipy";

export default async function GifFromSelectionCommand() {
	try {
		const query = (await getSelectedText()).trim();
		if (!query) {
			throw new Error("Select text first, then run this command.");
		}

		const response = await searchGifs({ query, limit: 1 });
		if (!response.results.length) {
			throw new Error(`No GIF results for "${query}".`);
		}

		await closeMainWindow();
		await runDefaultAction(response.results[0]);
	} catch (err) {
		await showToast({
			style: Toast.Style.Failure,
			title: "GIF from selection failed",
			message: err instanceof Error ? err.message : "Unknown error",
		});
	}
}
