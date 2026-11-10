<script lang="ts">
	import BlobCanvas from '#lib/blobs/BlobCanvas.svelte';
	import { C, approach, wobble, type Blob, type Scene } from '#lib/blobs/types.js';

	/*
	 * The hero scene is the campaign in one picture: green blobs are people and
	 * places. As they drift, bridges form and break: a living network.
	 * With a mouse, one more blob follows the pointer ("you") and links up with
	 * whatever it comes close to.
	 */
	const NODES: [number, number, number][] = [
		// x, y as fractions of the scene zone; r as a multiple of the base radius
		[0.06, 0.42, 1.25],
		[0.21, 0.1, 0.7],
		[0.31, 0.6, 1.0],
		[0.49, 0.22, 1.55],
		[0.63, 0.7, 0.62],
		[0.76, 0.28, 1.1],
		[0.92, 0.62, 0.85],
		[0.9, 0.02, 0.55],
		[0.42, 0.95, 0.45]
	];

	let section: HTMLElement;
	let copy: HTMLElement;
	/** Bottom of the blob zone: just above the hero text, so blobs never sit behind words. */
	let zoneBottom = 0;
	let pointer = { x: 0, y: 0, inside: false };
	const you = { x: 0, y: 0, r: 0 };
	let hoverCapable = $state(false);

	const scene: Scene = ({ time, dt, w, h, reduced }) => {
		const top = Math.min(h * 0.06, 48);
		const zoneH = Math.max((zoneBottom || h * 0.5) - top - 24, 80);
		const base = Math.max(18, Math.min(w * 0.05, zoneH * 0.16, 86));
		const pad = base * 1.2;
		const blobs: Blob[] = NODES.map(([fx, fy, fr], i) => {
			const [dx, dy] = wobble(i + 1, time, 26, base * 0.9);
			// Keep the drift inside the zone so blobs never wander behind the text.
			const r = fr * base;
			const y = Math.min(top + pad * 0.3 + fy * (zoneH - pad) + dy, top + zoneH - r);
			return { id: i + 1, x: fx * w + dx, y, r, color: C.green };
		});

		const target = pointer.inside && !reduced ? base * 0.6 : 0;
		if (dt === 0 || reduced) {
			you.x = pointer.x;
			you.y = pointer.y;
			you.r = target;
		} else {
			you.x = approach(you.x, pointer.x, 7, dt);
			you.y = approach(you.y, pointer.y, 7, dt);
			you.r = approach(you.r, target, 5, dt);
		}
		if (you.r > 0.5) blobs.push({ id: 99, x: you.x, y: you.y, r: you.r, color: C.green });
		return { blobs };
	};

	function onpointermove(e: PointerEvent) {
		if (e.pointerType !== 'mouse') return;
		const r = section.getBoundingClientRect();
		pointer = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true };
	}
	function onpointerleave() {
		pointer = { ...pointer, inside: false };
	}

	$effect(() => {
		hoverCapable = matchMedia('(hover: hover) and (pointer: fine)').matches;
		const measure = () => (zoneBottom = copy.offsetTop);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(section);
		return () => ro.disconnect();
	});
</script>

<section
	id="home"
	bind:this={section}
	aria-labelledby="hero-title"
	class="relative isolate flex h-[calc(100svh-4rem)] min-h-[38rem] flex-col justify-end overflow-hidden"
	onpointermove={hoverCapable ? onpointermove : undefined}
	onpointerleave={hoverCapable ? onpointerleave : undefined}
>
	<div class="absolute inset-0 -z-10">
		<BlobCanvas
			{scene}
			playing
			params={{ reach: 2.4, thickness: 0.3, flare: 0.38, smooth: 0.5, snap: 0.9, taper: 3, organic: 1, maxBridges: 3, noOverlap: true }}
		/>
	</div>

	<div bind:this={copy} class="wrap pb-8 md:pb-14">
		<div class="grid gap-8 lg:grid-cols-[1.75fr_1fr] lg:items-end lg:gap-16">
			<div>
				<p class="label label-dot">Adaptive Network of Trust</p>
				<h1 id="hero-title" class="display mt-5 max-w-[15ch]">When the network goes down, our connections remain.</h1>
			</div>
			<div class="max-w-[26rem] lg:pb-3">
				<p class="lead">
					ANT helps neighbours build a physical communication network before digital services become unreliable.
				</p>
				<div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
					<a href="#how-it-works" class="btn btn-primary">See how it works <span class="arrow arrow-down" aria-hidden="true">↓</span></a>
					<span class="text-sm">A preparation campaign, 2026–2035</span>
				</div>
			</div>
		</div>
	</div>
</section>
