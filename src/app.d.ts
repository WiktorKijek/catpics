import type { Database } from "#lib/server/db/index.ts";
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Session } from "#lib/server/session";

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			database: Database;
			session: Session | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
