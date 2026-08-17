/**
 * Shared context between DropdownMenu and DropdownMenuItem.
 *
 * On mobile the menu is rendered as a vaul bottom-sheet drawer instead of a
 * floating popover. Items rendered there live outside the bits-ui menu
 * context, so DropdownMenu exposes a `close` handle that lets each item
 * dismiss the drawer after it's selected (mirroring close-on-select).
 */
export type MobileDropdownMenuContext = {
	close: () => void;
};

export const MOBILE_DROPDOWN_MENU_CONTEXT_KEY = Symbol("mobile-dropdown-menu");
