<script lang="ts">
	import { Drawer } from "vaul-svelte";
	import type { Snippet } from "svelte";

	type Props = {
		open?: boolean;
		title: string;
		description?: string;
		children: Snippet;
		/**
		 * Optional snippet layered above everything while the dialog is open,
		 * e.g. a loading overlay. Rendered inside the <dialog> on desktop and
		 * outside the drawer portal on mobile so it can cover the viewport.
		 */
		overlay?: Snippet;
	};

	let { open = $bindable(false), title, description, children, overlay }: Props = $props();

	let isDesktop = $state(false);
	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		const mq = window.matchMedia("(min-width: 48rem)");
		isDesktop = mq.matches;
		const onChange = (event: MediaQueryListEvent) => (isDesktop = event.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	});

	$effect(() => {
		if (!isDesktop || !dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});
</script>

{#if isDesktop}
	<dialog bind:this={dialog} class="modal" onclose={() => (open = false)}>
		{#if overlay}
			<!-- pointer-events-none: the overlay is decorative (e.g. a loading bar);
			it must never swallow clicks aimed at the modal content. -->
			<div class="pointer-events-none absolute inset-0 z-[9999]">{@render overlay()}</div>
		{/if}
		<div class="modal-box">
			<h3 class="text-lg font-bold">{title}</h3>
			{#if description}
				<p class="text-base-content/60">{description}</p>
			{/if}
			<div class="py-4">{@render children()}</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{:else}
	{#if overlay}
		<!-- pointer-events-none: the overlay is decorative (e.g. a loading bar);
		it must never swallow clicks aimed at the drawer. -->
		<div class="pointer-events-none fixed inset-0 z-[100]">{@render overlay()}</div>
	{/if}
	<Drawer.Root bind:open>
		<Drawer.Portal>
			<Drawer.Overlay class="bg-neutral/50 fixed inset-0" />
			<Drawer.Content
				class="rounded-t-box bg-base-100 fixed inset-x-0 bottom-0 z-50 flex w-full flex-col"
			>
				<div
					class="bg-base-300 mx-auto mt-3 h-1.5 w-12 rounded-full"
					aria-hidden="true"
				></div>
				<div class="p-4">
					<Drawer.Title class="text-lg font-bold">{title}</Drawer.Title>
					{#if description}
						<Drawer.Description class="text-base-content/60"
							>{description}</Drawer.Description
						>
					{/if}
					<div class="pt-4 pb-8">{@render children()}</div>
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{/if}
