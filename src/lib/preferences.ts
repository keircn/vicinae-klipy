import { getPreferenceValues } from "@vicinae/api";

export type DefaultAction = "copy" | "open" | "browser";

type RawPreferences = {
	apiKey: string;
	clientKey?: string;
	apiBaseUrl?: string;
	defaultAction?: DefaultAction;
	openWithApp?: string;
	defaultMediaFormat?: string;
	mediaFilter?: string;
	contentFilter?: string;
	resultLimit?: string;
	country?: string;
	locale?: string;
};

export type ExtensionPreferences = {
	apiKey: string;
	clientKey?: string;
	apiBaseUrl: string;
	defaultAction: DefaultAction;
	openWithApp?: string;
	defaultMediaFormat: string;
	mediaFilter: string;
	contentFilter: string;
	resultLimit: number;
	country?: string;
	locale?: string;
};

const toPositiveInt = (value: string | undefined, fallback: number): number => {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPreferences = (): ExtensionPreferences => {
	const prefs = getPreferenceValues<RawPreferences>();
	return {
		apiKey: prefs.apiKey,
		clientKey: prefs.clientKey?.trim() || undefined,
		apiBaseUrl: (prefs.apiBaseUrl?.trim() || "https://api.klipy.com").replace(
			/\/+$/,
			"",
		),
		defaultAction: prefs.defaultAction ?? "copy",
		openWithApp: prefs.openWithApp?.trim() || undefined,
		defaultMediaFormat: prefs.defaultMediaFormat?.trim() || "gif",
		mediaFilter: prefs.mediaFilter?.trim() || "gif,tinygif,mp4,tinymp4,nanogif",
		contentFilter: prefs.contentFilter?.trim() || "medium",
		resultLimit: Math.min(toPositiveInt(prefs.resultLimit, 30), 50),
		country: prefs.country?.trim() || undefined,
		locale: prefs.locale?.trim() || undefined,
	};
};
