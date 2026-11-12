<script lang="ts">
	import { networkNodes, story } from '#lib/content.js';
	import NetworkScene from './NetworkScene.svelte';
	import { labelSideFor, positions } from './layout.js';
	import type { NodeId } from '#lib/content.js';

	/*
	 * Scroll story: the network stays pinned while the story steps scroll past.
	 * The step nearest the reading line drives the scene, so readers watch one
	 * resident join the network instead of decoding a diagram.
	 */
	let step = $state(0);
	let list: HTMLOListElement;
	let stageW = $state(0);
	let stageH = $state(0);

	const pos = $derived(positions(stageW, stageH));
	const R = $derived(Math.max(16, Math.min(stageW, stageH) * 0.062));
	const reached = (i: number) => i <= step;
	const nodeStep = (id: string) => story.findIndex((s) => s.node === id);

	/** Label placement next to a node, on the side no connection leaves from. */
	const sides = labelSideFor();
	function labelStyle(id: NodeId, x: number, y: number) {
		const r = R * (id === 'blob' ? 1.35 : 1) * 1.12 + 10;
		switch (sides[id]) {
			case 'above':
				return `left:${x}px; top:${y - r}px; transform:translate(-50%,-100%)`;
			case 'below':
				return `left:${x}px; top:${y + r}px; transform:translateX(-50%)`;
			case 'left':
				return `left:${x - r}px; top:${y}px; transform:translate(-100%,-50%)`;
			case 'right':
				return `left:${x + r}px; top:${y}px; transform:translateY(-50%)`;
		}
	}

	$effect(() => {
		let raf = 0;
		const update = () => {
			raf = 0;
			const items = list.querySelectorAll<HTMLElement>('[data-step]');
			// Reading line: mid-screen on desktop, lower on phones where the scene is pinned on top.
			const line = innerHeight * (innerWidth >= 1024 ? 0.5 : 0.72);
			let best = 0;
			let bestD = Infinity;
			items.forEach((el, i) => {
				const r = el.getBoundingClientRect();
				const d = Math.abs(r.top + Math.min(r.height, 160) / 2 - line);
				if (d < bestD) {
					bestD = d;
					best = i;
				}
			});
			step = best;
		};
		const onScroll = () => {
			if (!raf) raf = requestAnimationFrame(update);
		};
		update();
		addEventListener('scroll', onScroll, { passive: true });
		addEventListener('resize', onScroll);
		return () => {
			cancelAnimationFrame(raf);
			removeEventListener('scroll', onScroll);
			removeEventListener('resize', onScroll);
		};
	});
</script>

<section id="how-it-works" aria-labelledby="how-title" class="pt-20 md:pt-28">
	<div class="wrap">
		<div class="section-head">
			<div>
				<p class="label">01 &nbsp;How it works</p>
				<h2 id="how-title" class="title mt-6 max-w-[16ch]">A network made of people, places and paper.</h2>
			</div>
			<div class="max-w-[30rem]">
				<p class="lead">
					ANT connects neighbours through local Blobs: paper profiles to get to know each other, shared symbols to mark
					the neighbourhood and, when there is power, light between Blobs. Follow one resident as they join.
				</p>
				<a href="/explore" class="btn btn-ghost mt-6">Walk through it in 3D <span class="arrow" aria-hidden="true">→</span></a>
			</div>
		</div>

		<div class="mt-10 grid lg:mt-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
			<!-- Pinned scene. On phones it pins to the top and the steps scroll beneath it. -->
			<div
				class="sticky top-16 z-10 -mx-5 flex h-[50svh] flex-col bg-ant-grey px-5 pt-3 md:-mx-10 md:px-10 lg:top-[calc(4rem+2rem)] lg:mx-0 lg:h-[calc(100svh-4rem-4rem)] lg:px-0 lg:pt-0"
			>
				<div class="flex items-center justify-between">
					<p class="chip">How one resident joins</p>
					<p class="label" aria-hidden="true">Step {step + 1} / {story.length}</p>
				</div>
				<div class="relative min-h-0 flex-1" bind:clientWidth={stageW} bind:clientHeight={stageH}>
					<NetworkScene {step} />
					{#each networkNodes as n (n.id)}
						{@const [x, y] = pos[n.id]}
						<span
							class="pointer-events-none absolute text-[0.8rem] leading-tight whitespace-nowrap md:text-sm {reached(nodeStep(n.id))
								? 'font-bold'
								: ''}"
							style={labelStyle(n.id, x, y)}
							aria-hidden="true">{n.label}</span
						>
					{/each}
				</div>
			</div>

			<ol bind:this={list} class="relative pt-[8svh] pb-[20svh] lg:pt-[24svh] lg:pb-[30svh]">
				{#each story as s, i (s.node)}
					<li data-step class="flex min-h-[52svh] items-start gap-5 lg:min-h-[62svh]" aria-current={i === step ? 'step' : undefined}>
						<span
							class="grid size-11 shrink-0 place-items-center rounded-full border border-ant-black text-sm font-bold transition-colors duration-300 {i ===
							step
								? 'border-ant-green bg-ant-green'
								: ''}"
							aria-hidden="true">{String(i + 1).padStart(2, '0')}</span
						>
						<div class="max-w-[26rem] pt-1.5">
							<h3 class="text-3xl md:text-4xl">{s.title}</h3>
							<p class="lead mt-4">{s.text}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>

		<div class="flex flex-col gap-6 border-t border-ant-black pt-8 pb-4 md:flex-row md:items-center md:justify-between">
			<p class="font-display max-w-[30ch] text-2xl leading-tight [font-variation-settings:'opsz'_72] md:text-3xl">
				No servers, no signal needed. Just neighbours who know where to look.
			</p>
			<a href="#the-kit" class="btn btn-ghost shrink-0">What you need to start <span class="arrow arrow-down" aria-hidden="true">↓</span></a>
		</div>
	</div>
</section>
