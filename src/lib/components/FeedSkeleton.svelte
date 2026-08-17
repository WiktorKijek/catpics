<script lang="ts">
	let { count = 3 }: { count?: number } = $props();
</script>

<div class="-mx-4 flex w-[calc(100%+2rem)] flex-col gap-4 sm:mx-auto sm:w-full sm:max-w-lg">
	{#each Array.from({ length: count }) as _, i (i)}
		<div class="bg-base-100 sm:border-base-300 overflow-hidden sm:rounded-2xl sm:border">
			<div class="flex items-center gap-3 px-4 py-3">
				<div class="skeleton size-9 rounded-full"></div>
				<div class="flex flex-col gap-1">
					<div class="skeleton h-3 w-28"></div>
					<div class="skeleton h-2.5 w-20"></div>
				</div>
			</div>
			<div class="skeleton aspect-[4/5] w-full rounded-none"></div>
			<div class="flex flex-col gap-2 px-4 py-3">
				<div class="skeleton h-6 w-24"></div>
				<div class="skeleton h-3 w-full"></div>
				<div class="skeleton h-3 w-3/4"></div>
			</div>
		</div>
	{/each}
</div>
