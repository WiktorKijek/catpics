import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => ({
	username: params.user,
});
