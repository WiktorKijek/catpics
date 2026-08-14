<script lang="ts">
	import { browser } from "$app/env";
	import "../app.css";
	import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
	import Navbar from "#lib/components/Navbar.svelte";

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
			},
		},
	});

	const { children, data } = $props();
</script>

<QueryClientProvider client={queryClient}>
	<Navbar session={data.session} />
	{@render children()}
</QueryClientProvider>
