<script lang="ts">
	import { goto } from "$app/navigation";
	import { getErrorMessage, useRegister } from "#lib/queries/account";

	let username = $state("");
	let login = $state("");
	let password = $state("");

	const mutation = useRegister();

	const errorMessage = $derived(
		mutation.isError ? getErrorMessage(mutation.error) : null,
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		try {
			await mutation.mutateAsync({ username, login, password });
			goto("/");
		} catch {
			// error is rendered via mutation.error
		}
	}
</script>

<main class="grid min-h-screen place-items-center">
	<div class="card bg-base-200 w-full max-w-sm">
		<div class="card-body gap-4">
			<h1 class="card-title justify-center">Create an account</h1>
			<form onsubmit={handleSubmit} class="flex flex-col gap-3">
				<input
					type="text"
					placeholder="Username"
					class="input w-full"
					autocomplete="nickname"
					minlength="2"
					maxlength="32"
					required
					bind:value={username}
				/>
				<input
					type="text"
					placeholder="Login"
					class="input w-full"
					autocomplete="username"
					minlength="3"
					maxlength="254"
					required
					bind:value={login}
				/>
				<input
					type="password"
					placeholder="Password"
					class="input w-full"
					autocomplete="new-password"
					minlength="8"
					maxlength="128"
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
					Register
				</button>
			</form>
			<p class="flex justify-center">
				<a class="link link-hover" href="/login">Already have an account? Log in</a>
			</p>
		</div>
	</div>
</main>
