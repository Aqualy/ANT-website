<script lang="ts">
	/**
	 * /explore: how ANT works as a guided, skippable 3D diorama. The copy and
	 * controls are plain HTML; the 3D view is loaded only once this page mounts.
	 */
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { chapterIndex, chapters } from '#lib/components/explore/chapters.js';
	import ExploreFallback from '#lib/components/explore/ExploreFallback.svelte';
	import { ExploreState } from '#lib/components/explore/exploreState.svelte.js';

	const explore = new ExploreState();
	const last = chapters.length - 1;
	const chapter = $derived(explore.chapter);

	let root: HTMLElement;
	let panel: HTMLDivElement;
	/** The parts of the full-screen view that are covered: the chip row on top and the text panel (CSS px). The scene frames its subject in the rest. */
	let inset = $state({ top: 48, right: 0, bottom: 0 });
	let webgl = $state<'unknown' | 'yes' | 'no'>('unknown');
	let failed = $state(false);
	let ready = $state(false);
	let playing = $state(false);
	let viewer = $state<Promise<typeof import('#lib/components/explore/ExploreViewer.svelte')> | null>(null);
	const show3D = $derived(webgl === 'yes' && !failed);

	const AUTOPLAY_MS = 8000;

	function hasWebGL() {
		if (new URLSearchParams(location.search).has('nowebgl')) return false;
		try {
			return !!document.createElement('canvas').getContext('webgl2');
		} catch {
			return false;
		}
	}

	/** Every navigation goes through here, so the address bar always matches. */
	function go(i: number, mode: 'play' | 'settle' | 'replay' = 'settle') {
		if (!explore.go(i, mode)) return false;
		const hash = `#${explore.chapter.id}`;
		if (location.hash !== hash) {
			try {
				replaceState(hash, {});
			} catch {
				history.replaceState(history.state, '', hash);
			}
		}
		return true;
	}
	const next = () => go(explore.index + 1, 'play');
	const prev = () => go(explore.index - 1);

	onMount(() => {
		webgl = hasWebGL() ? 'yes' : 'no';
		const start = chapterIndex(location.hash);
		if (start > 0) explore.go(start);

		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		explore.reduced = mq.matches;
		const onMq = () => (explore.reduced = mq.matches);
		mq.addEventListener('change', onMq);

		const onHash = () => {
			const i = chapterIndex(location.hash);
			if (i >= 0) explore.go(i);
		};
		addEventListener('hashchange', onHash);

		// The panel sits on the right on wide screens and along the bottom otherwise.
		const measure = () => {
			const r = root.getBoundingClientRect();
			const p = panel.getBoundingClientRect();
			const side = p.width < r.width - 1;
			const right = side ? Math.round(r.right - p.left) : 0;
			const bottom = side ? 0 : Math.round(r.bottom - p.top);
			if (right !== inset.right || bottom !== inset.bottom) inset = { top: inset.top, right, bottom };
		};
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		ro.observe(panel);
		measure();

		// Any input hands control back to the visitor (the autoplay button itself excepted).
		const pause = (e: Event) => {
			const onButton = e.target instanceof Element && !!e.target.closest('[data-autoplay]');
			const activates = !(e instanceof KeyboardEvent) || e.key === 'Enter' || e.key === ' ';
			if (!(onButton && activates)) playing = false;
		};
		const inputs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
		for (const type of inputs) addEventListener(type, pause, { capture: true, passive: true });

		return () => {
			ro.disconnect();
			mq.removeEventListener('change', onMq);
			removeEventListener('hashchange', onHash);
			for (const type of inputs) removeEventListener(type, pause, { capture: true });
		};
	});

	// The 3D chunk (Three.js, Threlte, the world) is only fetched once the page has mounted.
	$effect(() => {
		if (show3D && !viewer)
			viewer = import('#lib/components/explore/ExploreViewer.svelte').catch((e) => {
				failed = true;
				viewer = null;
				throw e;
			});
	});

	$effect(() => {
		if (!playing) return;
		void explore.seq;
		const id = setTimeout(() => {
			if (!next()) playing = false;
		}, AUTOPLAY_MS);
		return () => clearTimeout(id);
	});

	/* ---------- keyboard ---------- */
	function onkeydown(e: KeyboardEvent) {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		const el = e.target as HTMLElement | null;
		if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
		const move: Record<string, () => unknown> = {
			ArrowRight: next,
			ArrowDown: next,
			PageDown: next,
			ArrowLeft: prev,
			ArrowUp: prev,
			PageUp: prev,
			Home: () => go(0),
			End: () => go(last)
		};
		if (move[e.key]) {
			e.preventDefault();
			move[e.key]();
		}
	}

	/* ---------- wheel / trackpad: one gesture, one chapter ---------- */
	$effect(() => {
		let acc = 0;
		let lastEvent = 0;
		let lastStep = 0;
		const onWheel = (e: WheelEvent) => {
			if (e.ctrlKey) return; // pinch zoom
			const dir = Math.sign(e.deltaY);
			if (!dir) return;
			// At either end, let the page scroll as usual.
			if ((dir > 0 && explore.index === last) || (dir < 0 && explore.index === 0)) return;
			e.preventDefault();
			// Event time, not handler time: events queued behind a slow frame keep their real spacing.
			const now = e.timeStamp;
			const gap = now - lastEvent;
			lastEvent = now;
			if (gap > 200) acc = 0;
			// Still the same gesture (trackpad inertia keeps sending events): ignore.
			if (now - lastStep < 500 || (gap < 150 && now - lastStep < 1600)) return;
			acc += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
			if (Math.abs(acc) < 36) return;
			acc = 0;
			lastStep = now;
			if (dir > 0) next();
			else prev();
		};
		root.addEventListener('wheel', onWheel, { passive: false });
		return () => root.removeEventListener('wheel', onWheel);
	});

	/* ---------- swipe on the stage ---------- */
	let touch: { x: number; y: number } | null = null;
	function ontouchstart(e: TouchEvent) {
		touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
	}
	function ontouchend(e: TouchEvent) {
		if (!touch) return;
		const dx = e.changedTouches[0].clientX - touch.x;
		const dy = e.changedTouches[0].clientY - touch.y;
		touch = null;
		if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
		if (dx < 0) next();
		else prev();
	}

	function retry3D() {
		failed = false;
		ready = false;
	}
</script>

<svelte:head>
	<title>Explore how ANT works — ANT, Adaptive Network of Trust</title>
	<meta
		name="description"
		content="Step through the ANT system in a 3D neighbourhood: the Blackout Communication Kit, paper profiles, local Blobs, shared symbols and light between Blobs."
	/>
</svelte:head>

<svelte:window {onkeydown} />

<section
	bind:this={root}
	class="relative h-[calc(100svh-var(--header-h))] min-h-[34rem] overflow-hidden lg:min-h-[38rem]"
	aria-labelledby="explore-title"
>
	<h1 id="explore-title" class="sr-only">How ANT works: a walk through the neighbourhood in nine chapters</h1>

	<!-- The view fills the whole section; the text panel lies over it. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="absolute inset-0 touch-pan-y" {ontouchstart} {ontouchend}>
		<p class="sr-only">
			A 3D paper model of a neighbourhood with houses, a local Blob kiosk and three other Blobs. Everything it shows is
			described in the text next to it.
		</p>
		{#if show3D}
			{#if viewer}
				{#await viewer then mod}
					<mod.default {explore} {inset} onready={() => (ready = true)} onfail={() => (failed = true)} />
				{:catch}
					<!-- handled by the import's catch handler -->
				{/await}
			{/if}
			{#if !ready}
				<div
					class="pointer-events-none absolute top-0 left-0 grid place-items-center"
					style:right="{inset.right}px"
					style:bottom="{inset.bottom}px"
				>
					<p class="flex items-center gap-3 text-sm font-bold"><span class="loader" aria-hidden="true"></span> Loading the neighbourhood…</p>
				</div>
			{/if}
		{:else if webgl !== 'unknown'}
			<div class="absolute top-0 left-0 pt-10" style:right="{inset.right}px" style:bottom="{inset.bottom}px">
				<ExploreFallback
					index={explore.index}
					reason={failed
						? 'The 3D view stopped working, so each chapter is shown as a simple diagram.'
						: 'Your browser cannot show the 3D view, so each chapter is shown as a simple diagram.'}
				/>
			</div>
		{/if}
		<div class="absolute top-4 left-5 flex flex-wrap items-center gap-2 md:left-10">
			<span class="chip pointer-events-none bg-ant-white">Speculative concept</span>
			{#if failed}
				<button type="button" class="btn btn-ghost btn-sm" onclick={retry3D}>Try 3D again</button>
			{/if}
		</div>
	</div>

	<!-- Solid page paper, so the text never sits on the scene itself. -->
	<div
		bind:this={panel}
		class="absolute inset-x-0 bottom-0 flex h-[52%] flex-col gap-5 overflow-y-auto border-t border-ant-black bg-ant-grey px-5 pt-4 pb-5 md:px-10 lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:w-[27rem] lg:justify-between lg:gap-6 lg:border-t-0 lg:py-10 xl:w-[31rem]"
	>
		<div aria-live="polite" aria-atomic="true">
			<p class="label">
				{#if chapter.step}<span
						class="grid size-8 place-items-center rounded-full bg-ant-green text-xs tracking-normal"
						aria-hidden="true">{String(chapter.step).padStart(2, '0')}</span
					>{/if}
				{chapter.eyebrow}
			</p>
			{#if chapter.logo}
				<img src="/brand/ANT_logo.svg" alt="ANT" class="mt-5 h-12 w-auto md:h-16" width="192" height="64" />
			{/if}
			<h2 class="mt-4 max-w-[15ch] text-3xl md:text-5xl lg:mt-5">{chapter.title}</h2>
			<p class="lead mt-3 max-w-[30rem] lg:mt-5">{chapter.text}</p>
			{#if chapter.note}<p class="mt-3 text-sm">{chapter.note}</p>{/if}
			{#if chapter.links}
				<p class="mt-6 flex flex-wrap gap-3">
					{#each chapter.links as l (l.href)}
						<a href={l.href} class="btn {l.primary ? 'btn-primary' : 'btn-ghost'}">{l.label}</a>
					{/each}
				</p>
			{/if}
		</div>

		<!-- On phones the controls sit right under the view, so they never move with the text. -->
		<nav aria-label="Chapters" class="order-first lg:order-last">
			<ol class="flex flex-wrap gap-1.5">
				{#each chapters as c, i (c.id)}
					<li>
						<button
							type="button"
							class="grid size-8 place-items-center rounded-full border text-xs font-bold transition-colors duration-200 {i ===
							explore.index
								? 'border-ant-green bg-ant-green'
								: 'border-ant-black hover:bg-ant-black hover:text-ant-grey'}"
							aria-label="Chapter {i}: {c.title}"
							aria-current={i === explore.index ? 'step' : undefined}
							onclick={() => go(i)}>{i}</button
						>
					</li>
				{/each}
			</ol>
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<button type="button" class="btn btn-ghost max-sm:px-4" onclick={prev} disabled={explore.index === 0}>
					<span aria-hidden="true">←</span> <span class="sr-only sm:not-sr-only">Previous</span>
				</button>
				<button type="button" class="btn btn-primary max-sm:px-5" onclick={next} disabled={explore.index === last}>
					Next <span class="arrow" aria-hidden="true">→</span>
				</button>
				<div class="ml-auto flex gap-2 lg:ml-0 lg:basis-full">
					<button type="button" class="btn btn-ghost btn-sm" data-autoplay aria-pressed={playing} onclick={() => (playing = !playing)}>
						{playing ? 'Pause' : 'Autoplay'}
					</button>
					{#if show3D && !explore.reduced}
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => go(explore.index, 'replay')}>Replay</button>
					{/if}
				</div>
			</div>
			<p class="mt-4 hidden text-sm lg:block">Arrow keys, scroll or swipe also move between chapters.</p>
		</nav>
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
