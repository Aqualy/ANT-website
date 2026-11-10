<script lang="ts">
	import BlobCanvas from '#lib/blobs/BlobCanvas.svelte';
	import { ORIGINAL_SCENE } from '#lib/blobs/original.js';
	import { originalScene } from '#lib/blobs/originalScene.js';

	/*
	 * The page ends on the supplied campaign artwork, rendered natively.
	 * It marks the one decision the page leads up to: get the kit.
	 * The scene lives beside the text (above it on phones), so the black
	 * blobs frame the message without ever crossing it.
	 */
	let copy: HTMLElement;
	/** Where the text starts (phones) or ends (desktop), so the scene's area stops short of it. */
	let textTop = 0;
	let textRight = 0;
	const scene = originalScene((w, h) =>
		w >= 1024
			? { x: Math.max(textRight + 48, w * 0.5), y: h * 0.06, w: w - Math.max(textRight + 48, w * 0.5), h: h * 0.88 }
			: { x: 0, y: 0, w, h: Math.max(textTop - 24, 120) }
	);

	$effect(() => {
		const measure = () => {
			const inner = copy.firstElementChild as HTMLElement;
			textTop = copy.offsetTop + inner.offsetTop;
			textRight = inner.offsetLeft + inner.offsetWidth;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(copy);
		return () => ro.disconnect();
	});
</script>

<section aria-labelledby="cta-title" class="relative isolate overflow-hidden bg-ant-green">
	<div class="absolute inset-0 -z-10">
		<BlobCanvas {scene} playing background={ORIGINAL_SCENE.background} params={ORIGINAL_SCENE.params} />
	</div>
	<div bind:this={copy} class="wrap flex min-h-[80svh] flex-col justify-end pt-[40svh] pb-16 lg:justify-center lg:py-24">
		<div class="max-w-[34rem]">
			<p class="label label-dot">Blackout Communication Kit</p>
			<h2 id="cta-title" class="title mt-6">Start on your own street.</h2>
			<p class="lead mt-6 max-w-[28rem]">
				The printable materials are being designed now. See what is ready to preview and what is coming next.
			</p>
			<a href="/resources" class="btn btn-dark mt-9">Get the Kit <span class="arrow" aria-hidden="true">→</span></a>
		</div>
	</div>
</section>
