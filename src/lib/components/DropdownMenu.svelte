<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import type { Snippet } from "svelte";

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
</script>

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
