<script lang="ts">
	import { diagramNodes, exampleUpdate, pillars, type DiagramNodeId } from '#lib/content.js';
	import NetworkDiagram from './NetworkDiagram.svelte';

	let selected = $state<DiagramNodeId>('hub');
	let step = $state<number | null>(null); // index into exampleUpdate while the example is shown

	const node = $derived(diagramNodes.find((n) => n.id === selected)!);
	const activeLink = $derived.by((): [DiagramNodeId, DiagramNodeId] | null => {
		if (step === null || step === 0) return null;
		return [exampleUpdate[step - 1].node, exampleUpdate[step].node];
	});

	function select(id: DiagramNodeId) {
		selected = id;
		step = null;
	}

	function goTo(i: number) {
		step = i;
		selected = exampleUpdate[i].node;
	}
</script>

<section id="how-it-works" aria-labelledby="how-title" class="border-t-2 border-ant-black bg-ant-grey py-16 md:py-24">
	<div class="wrap">
		<p class="eyebrow">How it works</p>
		<h2 id="how-title" class="section-title mt-3 max-w-[48rem]">A network made of people, places and paper.</h2>
		<p class="mt-5 max-w-[42rem] text-lg leading-snug">
			ANT connects residents, community hubs, meeting points, signs and printed materials. Together they form one
			physical system that keeps working without the internet. Tap a part of the network to learn what it does.
		</p>

		<div class="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
			<div class="border-2 border-ant-black bg-ant-white p-3 sm:p-6">
				<div class="hidden md:block">
					<NetworkDiagram layout="wide" {selected} {activeLink} onselect={select} />
				</div>
				<div class="md:hidden">
					<NetworkDiagram layout="tall" {selected} {activeLink} onselect={select} />
				</div>
			</div>

			<div class="flex flex-col gap-6">
				<div id="diagram-info" aria-live="polite" class="border-2 border-ant-black bg-ant-white p-6">
					<p class="eyebrow">Part of the network</p>
					<h3 class="mt-2 text-2xl">{node.title}</h3>
					<p class="mt-2 text-lg leading-snug">{node.text}</p>
				</div>

				<div class="on-dark bg-ant-black p-6 text-ant-white">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h3 class="text-xl">Example: sharing an update</h3>
						<span class="tag text-ant-green">Illustrative</span>
					</div>
					<p class="mt-2 text-ant-grey">How one piece of news travels through a neighbourhood without internet.</p>

					{#if step === null}
						<button type="button" class="btn btn-primary mt-5 w-full" onclick={() => goTo(0)}>Follow the update</button>
					{:else}
						<ol class="mt-5 space-y-2" aria-live="polite">
							{#each exampleUpdate as s, i (i)}
								<li class="flex gap-3 {i === step ? 'text-ant-white' : 'text-ant-grey/70'} {i > step ? 'sr-only' : ''}">
									<span
										class="grid size-7 shrink-0 place-items-center font-bold {i === step
											? 'bg-ant-green text-ant-black'
											: 'border border-ant-grey/70'}">{i + 1}</span
									>
									<span class="pt-0.5 {i === step ? 'font-bold' : ''}">{s.text}</span>
								</li>
							{/each}
						</ol>
						<div class="mt-5 flex gap-3">
							<button
								type="button"
								class="btn btn-secondary flex-1"
								disabled={step === 0}
								onclick={() => step !== null && goTo(step - 1)}>Back</button
							>
							{#if step < exampleUpdate.length - 1}
								<button type="button" class="btn btn-primary flex-1" onclick={() => step !== null && goTo(step + 1)}
									>Next step</button
								>
							{:else}
								<button type="button" class="btn btn-primary flex-1" onclick={() => goTo(0)}>Start again</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<ul class="mt-12 grid gap-px border-2 border-ant-black bg-ant-black md:grid-cols-3">
			{#each pillars as p, i (p.title)}
				<li class="bg-ant-grey p-6">
					<p class="text-sm font-bold">0{i + 1}</p>
					<h3 class="mt-1 text-2xl">{p.title}</h3>
					<p class="mt-2 leading-snug">{p.text}</p>
				</li>
			{/each}
		</ul>
	</div>
</section>
