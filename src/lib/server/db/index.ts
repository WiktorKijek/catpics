import { CamelCasePlugin, Kysely, type CompiledQuery } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { DB } from "./types";

const rawDatabases = new WeakMap<Kysely<DB>, D1Database>();

export function createDb(database: D1Database): Kysely<DB> {
	const db = new Kysely<DB>({
		dialect: new D1Dialect({ database }),
		plugins: [new CamelCasePlugin()],
	});
	rawDatabases.set(db, database);
	return db;
}

export type Database = Kysely<DB>;

/**
 * Executes queries atomically using D1's native `batch()` API.
 *
 * kysely-d1 does not implement Kysely's transaction interface
 * (`db.transaction()` throws "Transactions are not supported yet."),
 * so batch is the supported way to run multiple statements atomically.
 */
export async function batch(db: Database, queries: readonly CompiledQuery[]): Promise<void> {
	const database = rawDatabases.get(db);
	if (!database) {
		throw new Error("batch: database was not created by createDb");
	}

	const results = await database.batch(
		queries.map((query) => database.prepare(query.sql).bind(...query.parameters)),
	);

	for (const result of results) {
		if (result.error) throw new Error(result.error);
	}
}
