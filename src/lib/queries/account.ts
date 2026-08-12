import { createMutation } from "@tanstack/svelte-query";
import { login, type LoginInput } from "../../routes/api/v1/account/login.remote.ts";
import { logout } from "../../routes/api/v1/account/logout.remote.ts";
import { register, type RegisterInput } from "../../routes/api/v1/account/register.remote.ts";

export function useLogin() {
	return createMutation(() => ({
		mutationFn: (input: LoginInput) => login(input),
	}));
}

export function useRegister() {
	return createMutation(() => ({
		mutationFn: (input: RegisterInput) => register(input),
	}));
}

export function useLogout() {
	return createMutation(() => ({
		mutationFn: () => logout(),
	}));
}

export function getErrorMessage(error: unknown): string {
	const httpError = error as { body?: { message?: string } } | null;
	if (httpError?.body?.message) return httpError.body.message;
	if (error instanceof Error) return error.message;
	return "Something went wrong";
}
