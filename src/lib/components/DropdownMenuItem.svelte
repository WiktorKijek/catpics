<script lang="ts">
	import { DropdownMenu } from "bits-ui";
	import type { Snippet } from "svelte";

	type RestProps = Omit<DropdownMenu.ItemProps, "child" | "children">;
	type Props = RestProps & {
		children?: Snippet;
		/** Render the item as a link (e.g. <a href="...">) instead of a div. */
		href?: string;
		/** Extra classes merged onto the item. */
		class?: string;
	};

	let { href, children, class: className = "", ...rest }: Props = $props();

	const itemClass = $derived(
		"flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-base-200 data-[highlighted]:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:outline-none" +
			(className ? ` ${className}` : ""),
	);
</script>

{#if href}
	<DropdownMenu.Item {...rest}>
		{#snippet child(props)}
			<a {href} {...props} class={itemClass}>
				{@render children?.()}
			</a>
		{/snippet}
	</DropdownMenu.Item>
{:else}
	<DropdownMenu.Item {...rest} class={itemClass}>
		{@render children?.()}
	</DropdownMenu.Item>
{/if}
