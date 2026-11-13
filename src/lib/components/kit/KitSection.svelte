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

<section id="the-kit" aria-labelledby="kit-title" class="pt-20 md:pt-28">
	<div class="wrap">
		<div class="section-head">
			<div>
				<p class="label">02 &nbsp;The Kit</p>
				<h2 id="kit-title" class="title mt-6 max-w-[16ch]">Explore the Blackout Communication Kit.</h2>
			</div>
			<p class="lead max-w-[30rem]">
				A physical set of tools for meeting, organising and communicating without an online platform. One box, everything
				on paper.
			</p>
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[1.8fr_1fr] lg:gap-12" {onkeydown}>
			<!-- White stage: the one surface on the page meant to be handled and examined. -->
			<div
				bind:this={stage}
				class="relative h-[62svh] min-h-[24rem] max-h-[44rem] overflow-hidden rounded-[2rem] bg-ant-white"
			>
				<p class="sr-only">
					Interactive 3D model of the Blackout Communication Kit: a white box with the ANT logo and a green
					front, holding five printed items. All of its content is also available in the list next to it.
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
							<p class="flex items-center gap-3 text-sm font-bold">
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
						<button type="button" class="btn btn-ghost btn-sm absolute top-4 right-4" onclick={retry3D}>Try 3D again</button>
					{/if}
				{/if}

				{#if show3D}
					<p class="pointer-events-none absolute top-4 right-4 hidden rounded-full bg-ant-white px-3 py-1 text-sm sm:block">
						Drag to rotate · Scroll to zoom
					</p>
				{/if}

				<!-- Main actions float over the stage, where the eye already is. -->
				<div class="absolute inset-x-0 bottom-5 flex justify-center gap-3 px-4">
					{#if kit.view === 'closed'}
						<button type="button" class="btn btn-primary" onclick={() => kit.open()}>Open the kit</button>
					{:else}
						{#if kit.view === 'inspect'}
							<button type="button" class="btn btn-primary" onclick={() => kit.back()}>
								<span aria-hidden="true">←</span> Back to kit
							</button>
						{/if}
						<button type="button" class="btn btn-ghost bg-ant-white" onclick={() => kit.close()}>Close kit</button>
					{/if}
				</div>
			</div>

			<div class="flex flex-col">
				<h3 class="label">What's inside</h3>
				<ol class="mt-4 border-t border-ant-black">
					{#each kitItems as item, i (item.id)}
						{@const active = kit.selected === item.id}
						<li class="border-b border-ant-black">
							<button
								type="button"
								class="group flex w-full items-center gap-4 py-3.5 text-left"
								aria-pressed={active}
								aria-controls="kit-detail"
								onclick={() => choose(item.id)}
							>
								<span
									class="grid size-9 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors duration-300 {active
										? 'border-ant-green bg-ant-green'
										: 'border-ant-black group-hover:bg-ant-black group-hover:text-ant-grey'}"
									aria-hidden="true">{String(i + 1).padStart(2, '0')}</span
								>
								<span class="text-lg leading-tight {active ? 'font-bold' : ''}">{item.title}</span>
							</button>
						</li>
					{/each}
				</ol>

				<div id="kit-detail" class="mt-6 min-h-[9rem]" aria-live="polite">
					{#if selectedItem}
						<p class="label">{selectedItem.form}</p>
						<p class="lead mt-3">{selectedItem.description}</p>
						<p class="mt-3 leading-snug"><strong>For example:</strong> {selectedItem.example}</p>
					{:else if kit.view === 'open'}
						<p class="lead">Five printed tools. Pick one on the table or in the list to see what it is for.</p>
					{:else}
						<p class="lead">Open the kit to see the printed tools that help neighbours set up ANT.</p>
					{/if}
				</div>

			</div>
		</div>
	</div>
</section>

<style>
	.loader {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 999px;
		background: #c5d92f;
		animation: pulse 0.9s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		to {
			transform: scale(0.4);
		}
	}
</style>
