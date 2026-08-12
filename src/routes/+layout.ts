import { browser } from "$app/env";
import type { LayoutLoad } from "./$types";

const KEY = "session";

export const load: LayoutLoad = ({ data }) => {
	if (data) {
		if (browser) localStorage.setItem(KEY, JSON.stringify(data.session));
		return { ...data, offline: false };
	}
	try {
		return { session: JSON.parse(localStorage.getItem(KEY) ?? "null"), offline: true };
	} catch {
		return { session: null, offline: true };
	}
};
