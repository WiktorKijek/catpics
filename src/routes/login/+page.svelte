<script lang="ts">
	import { goto, refreshAll } from "$app/navigation";
	import { getErrorMessage, useLogin } from "#lib/queries/account";

	let username = $state("");
	let password = $state("");

	const mutation = useLogin();

	const errorMessage = $derived(mutation.isError ? getErrorMessage(mutation.error) : null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		try {
			await mutation.mutateAsync({ username, password });
			await refreshAll();
			goto("/");
		} catch {
			// error is rendered via mutation.error
		}
	}
</script>

<main class="grid min-h-dvh place-items-center px-4 sm:-mt-16">
	<div class="card bg-base-200 w-full max-w-sm">
		<div class="card-body gap-4">
			<h1 class="card-title justify-center">Log in</h1>
			<form onsubmit={handleSubmit} class="flex flex-col gap-3">
				<input
					type="text"
					placeholder="Username"
					class="input w-full"
					autocomplete="username"
					required
					bind:value={username}
				/>
				<input
					type="password"
					placeholder="Password"
					class="input w-full"
					autocomplete="current-password"
					required
					bind:value={password}
				/>
				{#if errorMessage}
					<div role="alert" class="alert alert-error">
						<span>{errorMessage}</span>
					</div>
				{/if}
				<button type="submit" class="btn btn-primary" disabled={mutation.isPending}>
					{#if mutation.isPending}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					Log in
				</button>
			</form>
			<p class="flex justify-center">
				<a class="link link-hover" href="/register">No account yet? Register</a>
			</p>
		</div>
	</div>
</main>
