<script lang="ts">
	/**
	 * The 3D infographic: how ANT works as a guided, skippable diorama in nine
	 * chapters. The copy and controls are plain HTML; the 3D view is loaded lazily.
	 *
	 * `embedded` (the homepage) keeps it a good neighbour on a scrolling page: the
	 * page scrolls as usual, arrow keys only act while focus is inside the stage,
	 * the address bar is left alone, and the 3D view only exists while the stage
	 * is near the viewport. Without it (/explore) the stage fills the screen, owns
	 * the arrow keys and the scroll wheel, and keeps the chapter in the URL hash.
	 *
	 * The caption and the controls lie on the scene itself, on ground the pop-up
	 * world keeps empty; the camera frames each subject in the part of the view
	 * they leave free (`inset`). Any print in a chapter can be looked at closely:
	 * click it, or pick it under "Look closer"; the caption then steps aside.
	 */
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { chapterIndex, chapters } from './chapters.js';
	import ExploreFallback from './ExploreFallback.svelte';
	import { ExploreState } from './exploreState.svelte.js';

	let { embedded = false, class: klass = '' }: { embedded?: boolean; class?: string } = $props();

	const explore = new ExploreState();
	const last = chapters.length - 1;
	const chapter = $derived(explore.chapter);

	let root: HTMLElement;
	let copy: HTMLDivElement;
	let bar: HTMLElement;
	/** The parts of the view covered by the chapter text and the controls (CSS px). The scene frames its subject in the rest. */
	let inset = $state({ top: 0, left: 0, right: 0, bottom: 0 });
	let webgl = $state<'unknown' | 'yes' | 'no'>('unknown');
	let failed = $state(false);
	let ready = $state(false);
	let playing = $state(false);
	/** Near the viewport (always true on /explore). */
	let near = $state(false);
	/** Actually on screen: autoplay stops once it scrolls away. */
	let visible = $state(false);
	let viewer = $state<Promise<typeof import('./ExploreViewer.svelte')> | null>(null);
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

	/** Every navigation goes through here, so on /explore the address bar always matches. */
	function go(i: number, mode: 'play' | 'settle' | 'replay' = 'settle') {
		if (!explore.go(i, mode)) return false;
		if (embedded) return true;
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
		const cleanups: (() => void)[] = [];

		if (!embedded) {
			near = visible = true;
			const start = chapterIndex(location.hash);
			if (start > 0) explore.go(start);
			const onHash = () => {
				const i = chapterIndex(location.hash);
				if (i >= 0) explore.go(i);
			};
			addEventListener('hashchange', onHash);
			cleanups.push(() => removeEventListener('hashchange', onHash));
		} else {
			// Load the 3D view a little before it scrolls in, and drop it (and its GPU context) once far away.
			const nearby = new IntersectionObserver(
				([e]) => {
					near = e.isIntersecting;
					if (!near) ready = false;
				},
				{ rootMargin: '600px 0px' }
			);
			const onScreen = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.25 });
			nearby.observe(root);
			onScreen.observe(root);
			cleanups.push(() => nearby.disconnect(), () => onScreen.disconnect());
		}

		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		explore.reduced = mq.matches;
		const onMq = () => (explore.reduced = mq.matches);
		mq.addEventListener('change', onMq);
		cleanups.push(() => mq.removeEventListener('change', onMq));

		// The caption lies lower left. On wide stages the subject is framed beside it; on narrow ones, above it.
		const measure = () => {
			const r = root.getBoundingClientRect();
			const c = copy.getBoundingClientRect();
			const b = bar.getBoundingClientRect();
			const side = c.width < r.width * 0.6;
			const next = {
				top: 0,
				left: side ? Math.round(c.right - r.left) : 0,
				right: 0,
				bottom: Math.round(r.bottom - (side ? b.top : c.top))
			};
			if (next.top !== inset.top || next.left !== inset.left || next.bottom !== inset.bottom) inset = next;
		};
		const ro = new ResizeObserver(measure);
		ro.observe(root);
		ro.observe(copy);
		ro.observe(bar);
		measure();
		cleanups.push(() => ro.disconnect());

		// Any input hands control back to the visitor (the autoplay button itself excepted).
		// Embedded, only input on the stage counts: scrolling the page past it doesn't.
		const pause = (e: Event) => {
			const onButton = e.target instanceof Element && !!e.target.closest('[data-autoplay]');
			const activates = !(e instanceof KeyboardEvent) || e.key === 'Enter' || e.key === ' ';
			if (!(onButton && activates)) playing = false;
		};
		const inputs = embedded ? (['pointerdown', 'keydown', 'touchstart'] as const) : (['pointerdown', 'keydown', 'wheel', 'touchstart'] as const);
		const target: EventTarget = embedded ? root : window;
		for (const type of inputs) target.addEventListener(type, pause, { capture: true, passive: true });
		cleanups.push(() => {
			for (const type of inputs) target.removeEventListener(type, pause, { capture: true });
		});

		return () => cleanups.forEach((c) => c());
	});

	// The 3D chunk (Three.js, Threlte, the world) is only fetched once the stage is near.
	$effect(() => {
		if (show3D && near && !viewer)
			viewer = import('./ExploreViewer.svelte').catch((e) => {
				failed = true;
				viewer = null;
				throw e;
			});
	});

	$effect(() => {
		if (!visible) playing = false;
	});

	$effect(() => {
		if (!playing) return;
		void explore.seq;
		// After the last chapter, autoplay starts over from the first one.
		const id = setTimeout(() => {
			if (!(explore.index === last ? go(0, 'play') : next())) playing = false;
		}, AUTOPLAY_MS);
		return () => clearTimeout(id);
	});

	/* ---------- keyboard ---------- */
	function onkeydown(e: KeyboardEvent) {
		if (e.altKey || e.ctrlKey || e.metaKey) return;
		const el = e.target as HTMLElement | null;
		if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
		if (e.key === 'Escape' && explore.focus) {
			explore.focus = null;
			return;
		}
		// Embedded, up/down and page keys stay with the page.
		const move: Record<string, () => unknown> = embedded
			? { ArrowRight: next, ArrowLeft: prev }
			: {
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
	const onWindowKey = (e: KeyboardEvent) => {
		if (!embedded) onkeydown(e);
	};

	/* ---------- wheel / trackpad on /explore: one gesture, one chapter ---------- */
	$effect(() => {
		if (embedded) return;
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

<svelte:window onkeydown={onWindowKey} />

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	bind:this={root}
	class="@container relative overflow-hidden bg-ant-grey {klass}"
	role="region"
	aria-roledescription="3D infographic"
	aria-label="How ANT works, in nine chapters"
	onkeydown={embedded ? onkeydown : undefined}
>
	<!-- The view fills the whole stage; the caption and controls lie on it. -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="absolute inset-0 touch-pan-y" {ontouchstart} {ontouchend}>
		<p class="sr-only">
			A 3D paper model of a neighbourhood with houses, a local Blob kiosk and three other Blobs. Like a pop-up book, only
			what a chapter is about stands up. Everything it shows is described in the caption.
		</p>
		{#if show3D}
			{#if viewer && near}
				{#await viewer then mod}
					<mod.default {explore} {inset} onready={() => (ready = true)} onfail={() => (failed = true)} />
				{:catch}
					<!-- handled by the import's catch handler -->
				{/await}
			{/if}
			{#if !ready}
				<div
					class="pointer-events-none absolute grid place-items-center"
					style:top="{inset.top}px"
					style:left="{inset.left}px"
					style:right="{inset.right}px"
					style:bottom="{inset.bottom}px"
				>
					<p class="flex items-center gap-3 text-sm font-bold"><span class="loader" aria-hidden="true"></span> Loading the neighbourhood…</p>
				</div>
			{/if}
		{:else if webgl !== 'unknown'}
			<div class="absolute" style:top="{inset.top}px" style:left="{inset.left}px" style:right="{inset.right}px" style:bottom="{inset.bottom}px">
				<ExploreFallback
					index={explore.index}
					reason={failed
						? 'The 3D view stopped working, so each chapter is shown as a simple diagram.'
						: 'Your browser cannot show the 3D view, so each chapter is shown as a simple diagram.'}
				/>
			</div>
		{/if}
	</div>

	<!--
		The caption lies on the model's table, lower left: the foreground, which the
		pop-up world keeps empty. No panel behind it. Close up, it steps aside and
		leaves the print to be read. Only links and buttons take the pointer.
	-->
	<div class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col">
		<div bind:this={copy} class="px-5 pb-4 md:px-8 @4xl:w-[26rem] @4xl:px-10 @4xl:pb-7 @6xl:w-[29rem]">
			<div aria-live="polite" aria-atomic="true">
				{#if !explore.focus}
					<p class="label">
						{#if chapter.step}<span
								class="grid size-8 place-items-center rounded-full bg-ant-green text-xs tracking-normal"
								aria-hidden="true">{String(chapter.step).padStart(2, '0')}</span
							>{/if}
						{chapter.eyebrow}
					</p>
					{#if chapter.logo}
						<img src="/brand/ANT_logo.svg" alt="ANT" class="mt-4 h-10 w-auto @4xl:h-14" width="192" height="64" />
					{/if}
					<svelte:element
						this={embedded ? 'h3' : 'h2'}
						class="mt-3 max-w-[16ch] text-[1.7rem] leading-[1.05] @4xl:mt-4 @4xl:text-4xl {embedded ? '' : '@6xl:text-5xl'}"
						>{chapter.title}</svelte:element
					>
					<p class="mt-2 max-w-[32rem] leading-snug @4xl:mt-4 @4xl:text-lg">{chapter.text}</p>
					{#if chapter.note}<p class="mt-3 text-sm">{chapter.note}</p>{/if}
				{:else}
					<p class="label">
						<span class="grid size-8 place-items-center rounded-full bg-ant-green text-xs tracking-normal" aria-hidden="true">+</span>
						Looking closer
					</p>
					<svelte:element this={embedded ? 'h3' : 'h2'} class="mt-3 text-[1.7rem] leading-[1.05] @4xl:mt-4 @4xl:text-4xl"
						>{chapter.closer?.find((c) => c.id === explore.focus)?.label}</svelte:element
					>
				{/if}
			</div>
			{#if chapter.links && !explore.focus}
				<p class="pointer-events-auto mt-4 flex flex-wrap gap-3 @4xl:mt-6">
					{#each chapter.links as l (l.href)}
						<a href={l.href} class="btn {l.primary ? 'btn-primary' : 'btn-ghost'}">{l.label}</a>
					{/each}
				</p>
			{/if}
			{#if chapter.closer && show3D}
				<div class="mt-3 @4xl:mt-5">
					{#if !explore.focus}<p class="label @max-4xl:hidden">Look closer</p>{/if}
					<ul class="pointer-events-auto mt-2 flex flex-wrap gap-1.5" aria-label="Look closer">
						{#each chapter.closer as c (c.id)}
							{@const on = explore.focus === c.id}
							<li>
								<button
									type="button"
									class="chip cursor-pointer {on ? 'border-ant-black bg-ant-green' : 'bg-ant-white hover:bg-ant-black hover:text-ant-white'}"
									aria-pressed={on}
									onclick={() => (explore.focus = on ? null : c.id)}>{c.label}</button
								>
							</li>
						{/each}
					</ul>
					{#if explore.focus}
						<button type="button" class="btn btn-dark btn-sm pointer-events-auto mt-3" onclick={() => (explore.focus = null)}>
							<span aria-hidden="true">←</span> Back to the scene
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- The steps and the controls, along the bottom of the scene. -->
		<nav
			bind:this={bar}
			aria-label="Chapters"
			class="pointer-events-auto flex flex-wrap items-center gap-x-4 gap-y-3 px-5 pb-4 md:px-8 @4xl:flex-nowrap @4xl:px-10 @4xl:pb-7"
		>
			<!-- The chapters as a chain: a line through nine stops, the ones behind you filled. -->
			<ol class="relative flex items-center gap-1.5 before:absolute before:inset-x-3 before:top-1/2 before:h-px before:bg-ant-black">
				{#each chapters as c, i (c.id)}
					<li class="relative">
						<button
							type="button"
							class="grid size-8 place-items-center rounded-full border border-ant-black text-xs font-bold transition-colors duration-200 {i ===
							explore.index
								? 'bg-ant-green'
								: i < explore.index
									? 'bg-ant-black text-ant-white'
									: 'bg-ant-grey hover:bg-ant-black hover:text-ant-grey'}"
							aria-label="Chapter {i}: {c.title}"
							aria-current={i === explore.index ? 'step' : undefined}
							onclick={() => go(i)}>{i}</button
						>
					</li>
				{/each}
			</ol>
			<div class="flex flex-wrap items-center gap-2 @4xl:ml-auto">
				<button type="button" class="btn btn-ghost bg-ant-grey max-sm:px-4" onclick={prev} disabled={explore.index === 0}>
					<span aria-hidden="true">←</span> <span class="sr-only sm:not-sr-only">Previous</span>
				</button>
				<button type="button" class="btn btn-primary max-sm:px-5" onclick={next} disabled={explore.index === last}>
					Next <span class="arrow" aria-hidden="true">→</span>
				</button>
				<button type="button" class="btn btn-ghost btn-sm bg-ant-grey" data-autoplay aria-pressed={playing} onclick={() => (playing = !playing)}>
					{playing ? 'Pause' : 'Autoplay'}
				</button>
				{#if show3D && !explore.reduced}
					<button type="button" class="btn btn-ghost btn-sm bg-ant-grey max-sm:hidden" onclick={() => go(explore.index, 'replay')}>Replay</button>
				{/if}
				{#if embedded}
					<!-- Opens on the same chapter (the hash is a chapter, not an element id). -->
					<a href={explore.index ? `/explore#${chapter.id}` : '/explore'} class="btn btn-ghost btn-sm bg-ant-grey">Full screen</a>
				{/if}
				{#if failed}
					<button type="button" class="btn btn-ghost btn-sm bg-ant-grey" onclick={retry3D}>Try 3D again</button>
				{/if}
			</div>
		</nav>
	</div>
</div>

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
