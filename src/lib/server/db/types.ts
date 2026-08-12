import type { Generated } from "kysely";

export interface UsersTable {
	id: string;
	username: string;
	is_admin: Generated<number>;
}

export interface LoginsTable {
	user_id: string;
	login: string;
	password_hash: string;
}

export interface SessionsTable {
	id: string;
	secret_hash: string;
	created_at: number;
	user_id: string;
}

export interface DB {
	users: UsersTable;
	logins: LoginsTable;
	sessions: SessionsTable;
}
