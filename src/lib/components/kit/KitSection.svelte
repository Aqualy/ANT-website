<script lang="ts">
	import { kitItems, type KitItemId } from '#lib/content.js';
	import { KitState } from './kitState.svelte';
	import KitFallback from './KitFallback.svelte';

	const kit = new KitState();

	let stage: HTMLDivElement;
	let near = $state(false);
	let webgl = $state<'unknown' | 'yes' | 'no'>('unknown');
	let failed = $state(false);
	let ready = $state(false);

	const selectedItem = $derived(kitItems.find((i) => i.id === kit.selected) ?? null);
	const show3D = $derived(webgl === 'yes' && !failed);

	// Lazy chunk: Three.js + Threlte are only downloaded when the section approaches.
	let viewerModule = $state<Promise<typeof import('./KitViewer.svelte')> | null>(null);

	function hasWebGL() {
		try {
			const c = document.createElement('canvas');
			return !!(c.getContext('webgl2') || c.getContext('webgl'));
		} catch {
			return false;
		}
	}

	$effect(() => {
		webgl = hasWebGL() ? 'yes' : 'no';

		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		kit.reducedMotion = mq.matches;
		const onMq = () => (kit.reducedMotion = mq.matches);
		mq.addEventListener('change', onMq);

		const observer = new IntersectionObserver(
			([entry]) => {
				near = entry.isIntersecting;
				if (!near) ready = false;
			},
			{ rootMargin: '400px 0px' }
		);
		observer.observe(stage);

		return () => {
			observer.disconnect();
			mq.removeEventListener('change', onMq);
		};
	});

	$effect(() => {
		if (near && show3D && !viewerModule)
			viewerModule = import('./KitViewer.svelte').catch((e) => {
				failed = true;
				viewerModule = null;
				throw e;
			});
	});

	function choose(id: KitItemId) {
		kit.inspect(id);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && kit.view === 'inspect') {
			kit.back();
		}
	}

	function retry3D() {
		failed = false;
		ready = false;
	}
</script>

<section id="the-kit" aria-labelledby="kit-title" class="border-t-2 border-ant-black bg-ant-white py-16 md:py-24">
	<div class="wrap">
		<p class="eyebrow">The Kit</p>
		<h2 id="kit-title" class="section-title mt-3 max-w-[48rem]">Explore the Blackout Communication Kit.</h2>
		<p class="mt-5 max-w-[42rem] text-lg leading-snug">
			A physical set of tools for meeting, organising and communicating without an online platform. It helps
			neighbours learn and set up ANT together.
		</p>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mt-10 grid gap-6 lg:grid-cols-[1.7fr_1fr]" {onkeydown}>
			<div class="flex flex-col border-2 border-ant-black">
				<!-- Main actions are regular HTML controls above the canvas -->
				<div class="flex flex-wrap items-center gap-3 border-b-2 border-ant-black bg-ant-white p-3">
					{#if kit.view === 'closed'}
						<button type="button" class="btn btn-primary" onclick={() => kit.open()}>Open the kit</button>
					{:else}
						{#if kit.view === 'inspect'}
							<button type="button" class="btn btn-primary" onclick={() => kit.back()}>
								<span aria-hidden="true">←</span> Back to kit
							</button>
						{/if}
						<button type="button" class="btn btn-secondary" onclick={() => kit.close()}>Close kit</button>
					{/if}
					<p class="ml-auto text-sm" aria-hidden={!show3D}>
						{#if show3D}
							Drag to rotate. Scroll or pinch to zoom.{kit.isOpen ? ' Tap an item to inspect it.' : ''}
						{/if}
					</p>
				</div>

				<div
					bind:this={stage}
					class="relative h-[58svh] min-h-[22rem] max-h-[40rem] bg-ant-grey"
				>
					<p class="sr-only">
						Interactive 3D concept model of the Blackout Communication Kit: a black box with the ANT logo containing six
						printed items. All of its content is also available in the list of items.
					</p>
					{#if show3D}
						{#if near && viewerModule}
							{#await viewerModule then mod}
								<mod.default {kit} onready={() => (ready = true)} onfail={() => (failed = true)} />
							{:catch}
								<!-- handled by the import's catch handler -->
							{/await}
						{/if}
						{#if !ready}
							<div class="pointer-events-none absolute inset-0 grid place-items-center" aria-live="polite">
								<p class="flex items-center gap-3 bg-ant-white px-4 py-3 font-bold">
									<span class="loader" aria-hidden="true"></span> Loading 3D kit…
								</p>
							</div>
						{/if}
					{:else if webgl !== 'unknown'}
						<KitFallback
							selected={kit.selected}
							reason={failed
								? 'The 3D view stopped working, so here is a simple plan of the kit.'
								: 'Your browser cannot show the 3D view, so here is a simple plan of the kit.'}
						/>
						{#if failed}
							<button type="button" class="btn btn-secondary absolute top-3 right-3" onclick={retry3D}>Try 3D again</button>
						{/if}
					{/if}
					<span class="tag absolute bottom-3 left-3 bg-ant-white">Concept model</span>
				</div>
			</div>

			<div class="flex flex-col gap-6">
				<div class="border-2 border-ant-black p-6" aria-live="polite">
					{#if selectedItem}
						<p class="eyebrow">{selectedItem.form}</p>
						<h3 class="mt-2 text-2xl">{selectedItem.title}</h3>
						<p class="mt-3 text-lg leading-snug">{selectedItem.description}</p>
						<p class="mt-3 leading-snug"><strong>Example:</strong> {selectedItem.example}</p>
					{:else if kit.view === 'open'}
						<p class="eyebrow">Kit open</p>
						<h3 class="mt-2 text-2xl">Six printed tools inside</h3>
						<p class="mt-3 leading-snug">Select an item in the box or in the list below to see what it is for.</p>
					{:else}
						<p class="eyebrow">Closed</p>
						<h3 class="mt-2 text-2xl">One box, everything on paper</h3>
						<p class="mt-3 leading-snug">Open the kit to see the printed tools that help neighbours set up ANT.</p>
					{/if}
				</div>

				<div>
					<h3 class="eyebrow mb-3">What's inside</h3>
					<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
						{#each kitItems as item, i (item.id)}
							<li>
								<button
									type="button"
									class="flex min-h-12 w-full items-center gap-3 border-2 border-ant-black px-3 py-2 text-left font-bold transition-colors hover:bg-ant-grey {kit.selected ===
									item.id
										? 'bg-ant-green hover:bg-ant-green'
										: 'bg-ant-white'}"
									aria-pressed={kit.selected === item.id}
									onclick={() => choose(item.id)}
								>
									<span class="grid size-7 shrink-0 place-items-center bg-ant-black text-sm text-ant-white">{i + 1}</span>
									{item.title}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<p class="text-sm leading-snug">
					This is a <strong>concept model</strong>. The box and printed items are design proposals drawn in the ANT
					identity, not final print designs. Only the ANT logo is original artwork.
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	.loader {
		width: 1rem;
		height: 1rem;
		background: #c5d92f;
		border: 2px solid #000;
		animation: pulse 0.9s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		to {
			transform: scale(0.5);
		}
	}
</style>
