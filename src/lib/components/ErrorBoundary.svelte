<script lang="ts">
	type RetryHandler = () => void | Promise<unknown>;
	type Props = {
		message: string;
		onRetry?: RetryHandler;
	};

	let { message, onRetry }: Props = $props();

	function retry() {
		void onRetry?.();
	}
</script>

<div
	class="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-16"
	role="alert"
	aria-live="assertive"
>
	<p class="text-base-content/60">{message}</p>
	{#if onRetry}
		<button class="btn btn-soft" type="button" onclick={retry}>Try again</button>
	{/if}
</div>
