<script lang="ts">
	import { prepareSteps } from '#lib/content.js';
	import BlobCanvas from '#lib/blobs/BlobCanvas.svelte';
	import { C, type Blob, type Scene } from '#lib/blobs/types.js';
	import { untrack } from 'svelte';

	/*
	 * The four steps as one growing chain: each circle is larger than the last
	 * and bridged to it, because every step builds on the one before.
	 * Circle centres come from the anchors in the markup, so the drawing always
	 * lines up with the text, in the row layout and the stacked phone layout.
	 */
	let host: HTMLDivElement;
	const anchors: HTMLElement[] = [];
	let centres: { x: number; y: number; size: number }[] = [];
	let shown = $state(false);
	let grow = 0;
	let version = $state(0);

	function measure() {
		const box = host.getBoundingClientRect();
		centres = anchors.map((a) => {
			const r = a.getBoundingClientRect();
			return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, size: r.width };
		});
		version++;
	}

	const ease = (t: number) => {
		const c = Math.min(Math.max(t, 0), 1);
		return 1 - Math.pow(1 - c, 3);
	};

	const scene: Scene = ({ dt, reduced }) => {
		if (!shown) return { blobs: [] };
		grow = reduced ? centres.length : Math.min(centres.length, grow + dt * 2.2);
		const blobs: Blob[] = centres.map((c, i) => ({
			id: i + 1,
			x: c.x,
			y: c.y,
			r: (c.size / 2) * ease(grow - i * 0.75),
			color: C.green
		}));
		return { blobs, busy: grow < centres.length };
	};

	$effect(() => {
		untrack(measure);
		const ro = new ResizeObserver(measure);
		ro.observe(host);
		const io = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) {
					shown = true;
					untrack(() => version++);
					io.disconnect();
				}
			},
			{ rootMargin: '0px 0px -25% 0px' }
		);
		io.observe(host);
		return () => {
			ro.disconnect();
			io.disconnect();
		};
	});
</script>

<section id="get-involved" aria-labelledby="involved-title" class="pt-20 pb-24 md:pt-28 md:pb-32">
	<div class="wrap">
		<div class="section-head">
			<div>
				<p class="label">03 &nbsp;Get involved</p>
				<h2 id="involved-title" class="title mt-6 max-w-[16ch]">Four steps to prepare together.</h2>
			</div>
			<p class="lead max-w-[30rem]">
				You don't need special skills. Start small, on your own street, long before anything goes wrong.
			</p>
		</div>

		<div bind:this={host} class="relative mt-12 lg:mt-20">
			<div class="pointer-events-none absolute inset-0">
				<BlobCanvas {scene} {version} params={{ reach: 3.6, thickness: 0.34, flare: 0.42, smooth: 0.6, snap: 0.95, taper: 2.6, organic: 0.5, maxBridges: 2, noOverlap: true }} />
			</div>

			<ol class="relative grid gap-10 lg:grid-cols-4 lg:gap-6">
				{#each prepareSteps as s, i (s.title)}
					<li class="grid grid-cols-[auto_1fr] items-center gap-6 lg:grid-cols-1 lg:content-start lg:items-start">
						<!-- Anchor: the circle is drawn here; it grows with each step. Bottoms align on wide screens. -->
						<div class="flex w-[6.5rem] justify-center lg:h-[14rem] lg:w-auto lg:items-end lg:justify-start">
						<span
							bind:this={anchors[i]}
							class="grid aspect-square place-items-center text-xl font-bold lg:text-2xl"
							style="width: clamp({4 + i * 0.75}rem, {9 + i * 2.2}vw, {7 + i * 2}rem)"
							aria-hidden="true">{String(i + 1).padStart(2, '0')}</span
						>
						</div>
						<div>
							<h3 class="text-3xl md:text-4xl">{s.title}</h3>
							<p class="mt-2 max-w-[18rem] leading-snug">{s.description}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>

	</div>
</section>
