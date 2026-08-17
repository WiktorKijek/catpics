<script lang="ts">
	import { DropdownMenu } from "bits-ui";
	import { getContext } from "svelte";
	import type { Snippet } from "svelte";
	import {
		MOBILE_DROPDOWN_MENU_CONTEXT_KEY,
		type MobileDropdownMenuContext,
	} from "./dropdownMenuContext.js";

	type RestProps = Omit<DropdownMenu.ItemProps, "child" | "children">;
	type Props = RestProps & {
		children?: Snippet;
		/** Render the item as a link (e.g. <a href="...">) instead of a div. */
		href?: string;
		/** Extra classes merged onto the item. */
		class?: string;
	};

	let {
		href,
		children,
		class: className = "",
		onSelect,
		disabled = false,
		closeOnSelect = true,
		...rest
	}: Props = $props();

	const mobileMenu = getContext<MobileDropdownMenuContext | null>(
		MOBILE_DROPDOWN_MENU_CONTEXT_KEY,
	);
	let isDesktop = $state(false);
	$effect(() => {
		const mq = window.matchMedia("(min-width: 48rem)");
		isDesktop = mq.matches;
		const onChange = (event: MediaQueryListEvent) => (isDesktop = event.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	});

	// Inside DropdownMenu's mobile drawer the item is a plain tappable row
	// (no bits-ui menu context there) that closes the drawer after selecting.
	const inMobileDrawer = $derived(!!mobileMenu && !isDesktop);

	const itemClass = $derived(
		"flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-base-200 data-[highlighted]:bg-base-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:outline-none" +
			(className ? ` ${className}` : ""),
	);

	const mobileItemClass = $derived(
		"flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors active:bg-base-200" +
			(className ? ` ${className}` : "") +
			(disabled ? " pointer-events-none opacity-50" : ""),
	);

	function handleSelect(event: MouseEvent) {
		if (disabled) {
			event.preventDefault();
			return;
		}
		// Same event bits-ui fires at menu items, so existing onSelect handlers
		// (which may call preventDefault() to stop the menu closing) keep working.
		const selectEvent = new CustomEvent("menuitemselect", { bubbles: true, cancelable: true });
		onSelect?.(selectEvent);
		if (selectEvent.defaultPrevented) return;
		if (closeOnSelect) mobileMenu?.close();
	}
</script>

{#if inMobileDrawer}
	{#if href}
		<a {href} onclick={handleSelect} aria-disabled={disabled} class={mobileItemClass}>
			{@render children?.()}
		</a>
	{:else}
		<button type="button" {disabled} onclick={handleSelect} class={mobileItemClass}>
			{@render children?.()}
		</button>
	{/if}
{:else}
	{#if href}
		<DropdownMenu.Item {...rest} {onSelect} {disabled} {closeOnSelect}>
			{#snippet child(props)}
				<a {href} {...props} class={itemClass}>
					{@render children?.()}
				</a>
			{/snippet}
		</DropdownMenu.Item>
	{:else}
		<DropdownMenu.Item {...rest} {onSelect} {disabled} {closeOnSelect} class={itemClass}>
			{@render children?.()}
		</DropdownMenu.Item>
	{/if}
{/if}