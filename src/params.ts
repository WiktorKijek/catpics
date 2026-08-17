import { defineParams } from "@sveltejs/kit/params";

/** Matches `/@username` profile routes and strips the leading `@`. */
export const params = defineParams({
	user: (param) => (param.startsWith("@") && param.length > 1 ? param.slice(1) : undefined),
});
