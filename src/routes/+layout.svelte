<script lang="ts">
	import { browser, dev } from "$app/env";
	import "../app.css";
	import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
	import Navbar from "#lib/components/Navbar.svelte";

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				// Keep fetched data fresh for a minute so client-side navigation
				// (e.g. feed -> profile -> feed -> profile) serves from cache instead
				// of refetching on every mount. Defaults to 0 (= always stale).
				staleTime: 60_000,
			},
		},
	});

	const { children, data } = $props();

	// Completely disable the service worker in development mode: unregister any
	// worker that got registered earlier (e.g. by a production build/preview or a
	// past dev session) and delete its caches so it can never intercept or cache
	// requests while developing. The worker is only ever registered in production
	// mode (see `serviceWorker.register` in vite.config.ts).
	if (browser && dev) {
		void (async () => {
			if ("serviceWorker" in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				await Promise.all(registrations.map((registration) => registration.unregister()));
			}

			if ("caches" in window) {
				const keys = await caches.keys();
				await Promise.all(
					keys.filter((key) => key.startsWith("cache-")).map((key) => caches.delete(key)),
				);
			}
		})();
	}
</script>

<QueryClientProvider client={queryClient}>
	<Navbar session={data.session} />
	{@render children()}
</QueryClientProvider>
