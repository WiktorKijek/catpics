<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { Camera, Check, Trash2, X } from "@lucide/svelte";
	import { useQueryClient } from "@tanstack/svelte-query";
	import Cropper from "svelte-easy-crop";
	import DialogDrawer from "./DialogDrawer.svelte";
	import { imageUrl } from "#lib/images";
	import { useUpdateProfile, useUploadAvatar } from "#lib/queries/profile";

	type Props = {
		open?: boolean;
		username: string;
		avatarKey: string | null;
		bio: string | null;
	};

	// Soft cap on the picked file: it is never uploaded as-is (the cropped webp
	// goes to the server), this only keeps the tab from decoding something absurd.
	const MAX_PICK_BYTES = 20 * 1024 * 1024;

	let { open = $bindable(false), username, avatarKey, bio }: Props = $props();

	const queryClient = useQueryClient();
	const upload = useUploadAvatar();
	const update = useUpdateProfile();

	let fileInput = $state<HTMLInputElement>();
	let cropSrc = $state<string | null>(null);
	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let pixels = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let bioText = $state("");
	let errorMessage = $state<string | null>(null);
	let saving = $state(false);

	// Seed the form from the current profile each time the dialog opens, and
	// drop any half-picked photo when it closes.
	let prevOpen = $state(open);
	$effect(() => {
		const nowOpen = open;
		if (nowOpen && !prevOpen) {
			bioText = bio ?? "";
			errorMessage = null;
		} else if (!nowOpen && prevOpen && cropSrc) {
			URL.revokeObjectURL(cropSrc);
			cropSrc = null;
		}
		prevOpen = nowOpen;
	});

	function onFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const selected = input.files?.[0] ?? null;
		input.value = ""; // allow picking the same file again later
		if (!selected) return;

		if (selected.size > MAX_PICK_BYTES) {
			errorMessage = "That photo is too large (max 20 MB).";
			return;
		}

		errorMessage = null;
		if (cropSrc) URL.revokeObjectURL(cropSrc);
		cropSrc = URL.createObjectURL(selected);
		crop = { x: 0, y: 0 };
		zoom = 1;
		pixels = null;
	}

	function onCropComplete(e: { percent: unknown; pixels: typeof pixels }) {
		pixels = e.pixels;
	}

	function loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error("Could not decode this photo"));
			img.src = src;
		});
	}

	/** Draws the cropped region of `img` onto a `size`×`size` canvas. */
	function cropCanvas(
		img: HTMLImageElement,
		area: NonNullable<typeof pixels>,
		size: number,
	): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext("2d")!;
		ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
		return canvas;
	}

	function canvasToDataUrl(canvas: HTMLCanvasElement, type: string): Promise<string> {
		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (!blob) return reject(new Error("Could not encode the photo"));
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result as string);
				reader.onerror = () => reject(new Error("Could not read the photo"));
				reader.readAsDataURL(blob);
			}, type);
		});
	}

	function finish() {
		open = false;
		// The avatar shows in the profile header, feed heads, and user rows.
		queryClient.invalidateQueries({ queryKey: ["profile"] });
		queryClient.invalidateQueries({ queryKey: ["feed"] });
		queryClient.invalidateQueries({ queryKey: ["user-posts"] });
		// Refresh server-side layout data so the navbar avatar updates too.
		void invalidateAll();
	}

	async function handleSave() {
		if (saving) return;

		saving = true;
		errorMessage = null;
		try {
			let newAvatarKey: string | undefined;
			if (cropSrc) {
				if (!pixels) throw new Error("No crop selected");
				const img = await loadImage(cropSrc);
				const [dataUrl512, dataUrl64] = await Promise.all([
					canvasToDataUrl(cropCanvas(img, pixels, 512), "image/webp"),
					canvasToDataUrl(cropCanvas(img, pixels, 64), "image/webp"),
				]);
				newAvatarKey = (await upload.mutateAsync({ dataUrl512, dataUrl64 })).key;
			}

			await update.mutateAsync({
				bio: bioText.trim() ? bioText.trim() : "",
				avatarKey: newAvatarKey,
			});

			finish();
		} catch {
			errorMessage = "Something went wrong saving your profile. Try again.";
		} finally {
			saving = false;
		}
	}

	async function handleRemoveAvatar() {
		if (saving) return;

		saving = true;
		errorMessage = null;
		try {
			// An explicit empty string clears the avatar in update.remote.ts.
			await update.mutateAsync({ avatarKey: "" });
			finish();
		} catch {
			errorMessage = "Something went wrong removing your photo. Try again.";
		} finally {
			saving = false;
		}
	}
</script>

<DialogDrawer bind:open title="Edit profile" description={`@${username}`}>
	<div class="flex flex-col items-center gap-4">
		{#if cropSrc}
			<div class="relative aspect-square w-full overflow-hidden rounded-xl">
				<Cropper
					image={cropSrc}
					aspect={1}
					cropShape="round"
					bind:crop
					bind:zoom
					oncropcomplete={onCropComplete}
				/>
			</div>
			<div class="w-full">
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1"
					disabled={saving}
					onclick={() => {
						URL.revokeObjectURL(cropSrc!);
						cropSrc = null;
						pixels = null;
					}}
				>
					<X size={14} />
					Cancel photo
				</button>
			</div>
		{:else}
			<div class="relative">
				{#if avatarKey}
					<img
						src={imageUrl(avatarKey) ?? ""}
						alt="Your avatar"
						class="bg-neutral size-24 rounded-full object-cover"
					/>
				{:else}
					<div
						class="bg-neutral text-neutral-content grid size-24 place-items-center rounded-full text-4xl font-bold"
					>
						{username.charAt(0).toUpperCase()}
					</div>
				{/if}
				<button
					type="button"
					class="btn btn-primary btn-circle btn-sm absolute right-0 bottom-0"
					aria-label="Change photo"
					disabled={saving}
					onclick={() => fileInput?.click()}
				>
					<Camera size={16} />
				</button>
			</div>
			{#if avatarKey}
				<button
					type="button"
					class="btn btn-ghost btn-error btn-xs gap-1"
					disabled={saving}
					onclick={handleRemoveAvatar}
				>
					<Trash2 size={14} />
					Remove photo
				</button>
			{/if}
		{/if}

		<textarea
			class="textarea textarea-bordered w-full resize-none"
			rows="3"
			placeholder="Tell the world about your cat..."
			maxlength="200"
			bind:value={bioText}
			disabled={saving}></textarea>

		<button
			type="button"
			class="btn btn-primary w-full gap-2"
			disabled={saving}
			onclick={handleSave}
		>
			<Check size={16} />
			{saving ? "Saving..." : "Save"}
		</button>

		{#if errorMessage}
			<p class="text-error text-sm">{errorMessage}</p>
		{/if}
	</div>
</DialogDrawer>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	class="hidden"
	onchange={onFileSelected}
/>
