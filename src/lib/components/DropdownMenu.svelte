<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { setContext } from "svelte";
	import { Drawer } from "vaul-svelte";
	import type { Snippet } from "svelte";
	import { MOBILE_DROPDOWN_MENU_CONTEXT_KEY } from "./dropdownMenuContext.js";

	type Props = {
		/** Markup rendered inside the trigger button (e.g. avatar + username). */
		trigger: Snippet;
		/** Menu body: DropdownMenuItem components, separators or plain markup. */
		children: Snippet;
		/** Preferred side for the menu relative to the trigger. */
		side?: "top" | "right" | "bottom" | "left";
		/** Alignment of the menu against the trigger edge. */
		align?: "start" | "center" | "end";
		/** Gap in px between the trigger and the menu. */
		sideOffset?: number;
		/** Extra offset in px along the trigger edge. */
		alignOffset?: number;
		/** Let keyboard navigation wrap around instead of stopping at the ends. */
		loop?: boolean;
		/** Controlled open state; supports bind:open. */
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		/** Classes for the trigger button. */
		triggerClass?: string;
		/** Extra classes for the menu panel (e.g. width). */
		contentClass?: string;
		/** Accessible name for the trigger button. */
		label?: string;
		/** Tooltip shown on the trigger button. */
		title?: string;
		disabled?: boolean;
	};

	let {
		trigger,
		children,
		side = "bottom",
		align = "end",
		sideOffset = 8,
		alignOffset = 0,
		loop = true,
		open = $bindable(false),
		onOpenChange = undefined,
		triggerClass = "",
		contentClass = "",
		label,
		title,
		disabled = false,
	}: Props = $props();

	let isDesktop = $state(false);

	$effect(() => {
		const mq = window.matchMedia("(min-width: 48rem)");
		isDesktop = mq.matches;
		const onChange = (event: MediaQueryListEvent) => (isDesktop = event.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	});

	// Menu items (children) render as plain rows inside the mobile drawer,
	// where no bits-ui menu context exists — give them a handle to dismiss
	// the drawer after a selection.
	setContext(MOBILE_DROPDOWN_MENU_CONTEXT_KEY, { close: () => (open = false) });
</script>

{#if isDesktop}
	<BitsDropdownMenu.Root bind:open {onOpenChange}>
		<BitsDropdownMenu.Trigger {disabled} {title} aria-label={label} class={triggerClass}>
			{@render trigger()}
		</BitsDropdownMenu.Trigger>
		<BitsDropdownMenu.Content
			{side}
			{align}
			{sideOffset}
			{alignOffset}
			{loop}
			class="rounded-box border-base-300 bg-base-100 z-50 flex flex-col gap-0.5 border p-1.5 shadow-xl {contentClass}"
		>
			{@render children()}
		</BitsDropdownMenu.Content>
	</BitsDropdownMenu.Root>
{:else}
	<Drawer.Root bind:open {onOpenChange}>
		<button
			type="button"
			class={triggerClass}
			{disabled}
			{title}
			aria-label={label}
			aria-haspopup="menu"
			aria-expanded={open}
			onclick={() => (open = true)}
		>
			{@render trigger()}
		</button>
		<Drawer.Portal>
			<Drawer.Overlay class="bg-neutral/50 fixed inset-0" />
			<Drawer.Content
				class="rounded-t-box bg-base-100 fixed inset-x-0 bottom-0 z-50 flex w-full flex-col"
			>
				<div
					class="bg-base-300 mx-auto mt-3 h-1.5 w-12 rounded-full"
					aria-hidden="true"
				></div>
				<div class="flex flex-col gap-1 p-3 pb-4">{@render children()}</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{/if}