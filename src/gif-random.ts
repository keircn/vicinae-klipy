import { closeMainWindow, showToast, Toast } from "@vicinae/api";
import { runDefaultAction } from "./lib/actions";
import { trendingGifs } from "./lib/klipy";

export default async function GifRandomCommand() {
	try {
		const response = await trendingGifs({ limit: 40 });
		if (!response.results.length) {
			throw new Error("No trending GIFs were returned.");
		}
		const selected =
			response.results[Math.floor(Math.random() * response.results.length)];
		await closeMainWindow();
		await runDefaultAction(selected);
	} catch (err) {
		await showToast({
			style: Toast.Style.Failure,
			title: "Random GIF failed",
			message: err instanceof Error ? err.message : "Unknown error",
		});
	}
}
