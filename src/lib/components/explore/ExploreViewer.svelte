<script lang="ts">
	/** Client-only Threlte canvas for /explore, plus the HTML labels that sit over it. Imported lazily. */
	import { Canvas } from '@threlte/core';
	import { NoToneMapping, PCFShadowMap, WebGLRenderer } from 'three';
	import { onMount } from 'svelte';
	import { loadPrintFonts } from '#lib/components/world/prints.js';
	import ExploreScene from './ExploreScene.svelte';
	import type { ExploreState } from './exploreState.svelte';
	import type { Label } from './chapters.js';

	let {
		explore,
		inset,
		onready,
		onfail
	}: {
		explore: ExploreState;
		/** Parts of the view covered by the page's chip row and text panel (CSS px). */
		inset: { top: number; right: number; bottom: number };
		onready: () => void;
		onfail: () => void;
	} = $props();

	let host: HTMLDivElement;
	let fonts = $state(false);

	onMount(() => {
		let gone = false;
		// Printed textures are drawn with the site's fonts, so wait for them.
		loadPrintFonts().then(() => {
			if (!gone) fonts = true;
		});
		return () => (gone = true);
	});

	// Report readiness once the canvas exists, and fall back if the GPU context is lost.
	$effect(() => {
		if (!fonts) return;
		const canvas = host.querySelector('canvas');
		if (!canvas) return;
		const lost = (e: Event) => {
			e.preventDefault();
			onfail();
		};
		canvas.addEventListener('webglcontextlost', lost);
		const id = requestAnimationFrame(() => onready());
		return () => {
			cancelAnimationFrame(id);
			canvas.removeEventListener('webglcontextlost', lost);
		};
	});

	const createRenderer = (canvas: HTMLCanvasElement) => {
		try {
			return new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' });
		} catch (e) {
			queueMicrotask(onfail);
			throw e;
		}
	};

	/* Labels: the scene projects each anchor and moves the element directly, without re-rendering. */
	const els = new Map<string, HTMLElement>();
	/** Label widths, measured once per view width: reading layout on every frame would force a reflow per label. */
	const widths = new Map<HTMLElement, number>();
	let measuredAt = 0;
	function anchor(node: HTMLElement, id: string) {
		els.set(id, node);
		return {
			destroy() {
				if (els.get(id) === node) els.delete(id);
				widths.delete(node);
			}
		};
	}
	function place(id: string, x: number, y: number, width: number) {
		const el = els.get(id);
		if (!el) return;
		// Keep the whole label inside the view when its anchor is near an edge.
		if (width !== measuredAt) {
			measuredAt = width;
			widths.clear();
		}
		let own = widths.get(el);
		if (own === undefined) widths.set(el, (own = (el.firstElementChild as HTMLElement).offsetWidth));
		const half = own / 2 + 6;
		const free = width - inset.right;
		const cx = half * 2 >= free ? free / 2 : Math.max(half, Math.min(free - half, x));
		el.style.transform = `translate(${cx.toFixed(1)}px,${y.toFixed(1)}px)`;
	}

	const labels = $derived(explore.chapter.labels);
	const shown = (l: Label) => explore.shown.includes(l.id);
	const lit = (l: Label) => explore.lit.includes(l.id);

	function act(l: Label) {
		if (l.action === 'turn') explore.pageTurned = !explore.pageTurned;
		else if (l.action) explore.choice = l.action;
	}
</script>

{#snippet face(l: Label)}
	{#if l.kind === 'chip'}
		{#if l.action}
			<button
				type="button"
				class="chip pointer-events-auto cursor-pointer {lit(l) ? 'border-ant-green bg-ant-green' : 'bg-ant-white'}"
				aria-pressed={l.action === 'turn' ? undefined : lit(l)}
				tabindex={shown(l) ? 0 : -1}
				onclick={() => act(l)}>{l.action === 'turn' && !explore.pageTurned ? 'Turn the page again' : l.text}</button
			>
		{:else}
			<span class="chip {lit(l) ? 'border-ant-green bg-ant-green' : 'bg-ant-white'}">{l.text}</span>
		{/if}
	{:else}
		<span class="text-[0.8rem] leading-tight whitespace-nowrap md:text-sm {l.kind === 'caption' ? 'font-bold' : ''}">{l.text}</span>
	{/if}
{/snippet}

<div bind:this={host} class="absolute inset-0">
	{#if fonts}
		<Canvas {createRenderer} dpr={[1, 1.5]} renderMode="on-demand" toneMapping={NoToneMapping} shadows={PCFShadowMap}>
			<ExploreScene {explore} {inset} {place} />
		</Canvas>
	{/if}

	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each labels.filter((l) => l.anchor !== 'stage') as l (l.id)}
			<div use:anchor={l.id} class="absolute top-0 left-0 will-change-transform" aria-hidden={l.action ? undefined : 'true'}>
				<div
					class="absolute left-0 w-max -translate-x-1/2 transition-opacity duration-300 {l.place === 'below'
						? 'top-2'
						: 'bottom-2'} {shown(l) ? 'opacity-100' : 'opacity-0'}"
				>
					{@render face(l)}
				</div>
			</div>
		{/each}
		<div
			class="absolute left-4 flex flex-wrap justify-center gap-2"
			style:right="{inset.right + 16}px"
			style:bottom="{inset.bottom + 16}px"
		>
			{#each labels.filter((l) => l.anchor === 'stage') as l (l.id)}
				<div class="transition-opacity duration-300 {shown(l) ? 'opacity-100' : 'pointer-events-none opacity-0'}">
					{@render face(l)}
				</div>
			{/each}
		</div>
	</div>
</div>
