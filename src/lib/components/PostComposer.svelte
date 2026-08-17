<script lang="ts">
	import confetti from "@hiseb/confetti";
	import { Camera, ImagePlus, X } from "@lucide/svelte";
	import { useQueryClient } from "@tanstack/svelte-query";
	import DialogDrawer from "./DialogDrawer.svelte";
	import { useCreatePost, useUploadImage } from "#lib/queries/posts";

	type Session = {
		userId: string;
		isAdmin: boolean;
		username: string | null;
	};

	let { session, open = $bindable(false) }: { session: Session; open?: boolean } = $props();

	const queryClient = useQueryClient();
	const upload = useUploadImage();
	const create = useCreatePost();

	// Keep oversized picks from ever reaching the server (upload caps at ~18 MB binary).
	const MAX_IMAGE_BYTES = 18 * 1024 * 1024;
	// Mirrors the server whitelist: photos only, no GIFs or other formats.
	const PHOTO_TYPES = new Set([
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/avif",
		"image/heic",
		"image/heif",
	]);

	let file = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let caption = $state("");
	let errorMessage = $state<string | null>(null);
	let posting = $state(false);

	let cameraInput = $state<HTMLInputElement>();
	let fileInput = $state<HTMLInputElement>();

	// Reset the form whenever the dialog goes from open to closed (Esc, backdrop,
	// swipe) so the next open starts fresh.
	let prevOpen = $state(open);
	$effect(() => {
		const nowOpen = open;
		if (prevOpen && !nowOpen) resetComposer();
		prevOpen = nowOpen;
	});

	function onFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const selected = input.files?.[0] ?? null;
		input.value = ""; // allow picking the same file again later
		if (!selected) return;

		if (!PHOTO_TYPES.has(selected.type)) {
			errorMessage = "Only photos are allowed (JPEG, PNG, WebP, AVIF, HEIC).";
			return;
		}
		if (selected.size > MAX_IMAGE_BYTES) {
			errorMessage = "That photo is too large (max 18 MB).";
			return;
		}

		errorMessage = null;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		file = selected;
		previewUrl = URL.createObjectURL(selected);
	}

	function removePhoto() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		file = null;
		previewUrl = null;
		errorMessage = null;
	}

	function resetComposer() {
		removePhoto();
		caption = "";
		posting = false;
	}

	function fileToDataUrl(f: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(new Error("Could not read the photo"));
			reader.readAsDataURL(f);
		});
	}

	async function handlePost() {
		if (!file || posting) return;

		posting = true;
		errorMessage = null;
		try {
			const dataUrl = await fileToDataUrl(file);
			const { key } = await upload.mutateAsync({ dataUrl });
			const result = await create.mutateAsync({
				imageKeys: [key],
				caption: caption.trim() ? caption.trim() : undefined,
			});

			open = false;
			resetComposer();

			// New post lands at the top of the feed; the user's own grid and
			// streak/profile data reflect it too.
			queryClient.invalidateQueries({ queryKey: ["feed"] });
			queryClient.invalidateQueries({ queryKey: ["user-posts", session.userId] });
			queryClient.invalidateQueries({ queryKey: ["streaks"] });
			queryClient.invalidateQueries({ queryKey: ["profile", "me"] });

			if (result.streakIncreased) fireConfetti();
		} catch {
			errorMessage = "Something went wrong posting your photo. Try again.";
		} finally {
			posting = false;
		}
	}

	function fireConfetti() {
		// Catppuccin pastel accents, matching the app theme.
		const colors = ["#f38ba8", "#f9e2af", "#a6e3a1", "#89b4fa", "#cba6f7", "#fab387"];
		confetti({
			count: 150,
			position: { x: window.innerWidth / 2, y: window.innerHeight / 3 },
			color: colors,
			velocity: 140,
			size: 1.4,
			fade: true,
		});
	}
</script>

{#snippet overlay()}
	<!-- Transparent, full-screen loading indicator shown only while posting. -->
	{#if posting}
		<div class="pointer-events-none fixed inset-0" aria-hidden="true">
			<div class="h-0.5 w-full overflow-hidden">
				<div
					class="post-progress-bar from-primary via-secondary to-primary h-full w-1/3 rounded-full bg-gradient-to-r"
				></div>
			</div>
		</div>
	{/if}
{/snippet}

<DialogDrawer bind:open title="New post" description="Share a cat photo" {overlay}>
	{#if file && previewUrl}
		<div class="relative overflow-hidden rounded-xl">
			<img
				src={previewUrl}
				alt="Your post preview"
				class="aspect-[4/5] w-full object-cover"
			/>
			<button
				type="button"
				class="btn btn-circle btn-sm bg-base-100/80 absolute top-2 right-2 backdrop-blur"
				aria-label="Remove photo"
				disabled={posting}
				onclick={removePhoto}
			>
				<X size={16} />
			</button>
		</div>

		<div class="mt-4 flex flex-col gap-3">
			<textarea
				class="textarea textarea-bordered w-full resize-none"
				rows="2"
				placeholder="Add a caption..."
				maxlength="2200"
				bind:value={caption}
				disabled={posting}></textarea>
			<button
				type="button"
				class="btn btn-primary w-full"
				disabled={posting}
				onclick={handlePost}
			>
				Post
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			<button
				type="button"
				class="btn btn-neutral h-40! flex-col gap-3 border-dashed"
				disabled={posting}
				onclick={() => cameraInput?.click()}
			>
				<Camera size={28} />
				<span class="font-semibold">Take a photo</span>
				<span class="text-base-content/60 text-xs font-normal"
					>Opens the camera on your phone</span
				>
			</button>
			<button
				type="button"
				class="btn btn-ghost border-base-300 border"
				disabled={posting}
				onclick={() => fileInput?.click()}
			>
				<ImagePlus size={20} />
				Upload a photo
			</button>
		</div>
	{/if}

	{#if errorMessage}
		<p class="text-error mt-3 text-sm">{errorMessage}</p>
	{/if}
</DialogDrawer>

<input
	bind:this={cameraInput}
	type="file"
	accept="image/*"
	capture="environment"
	class="hidden"
	onchange={onFileSelected}
/>
<input
	bind:this={fileInput}
	type="file"
	accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
	class="hidden"
	onchange={onFileSelected}
/>

<style>
	.post-progress-bar {
		animation: post-progress 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes post-progress {
		0% {
			transform: translateX(-100%);
			opacity: 0.4;
		}
		20% {
			opacity: 1;
		}
		100% {
			transform: translateX(300%);
			opacity: 1;
		}
	}
</style>
