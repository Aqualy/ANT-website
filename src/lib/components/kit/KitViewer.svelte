<script lang="ts">
	/** Client-only Threlte canvas. Imported lazily by KitSection. */
	import { Canvas } from '@threlte/core';
	import { NeutralToneMapping, PCFShadowMap, WebGLRenderer } from 'three';
	import { onDestroy, onMount } from 'svelte';
	import KitScene from './KitScene.svelte';
	import type { KitState } from './kitState.svelte';
	import { createKitTextures, disposeKitTextures, type KitTextures } from './textures';

	let { kit, onready, onfail }: { kit: KitState; onready: () => void; onfail: () => void } = $props();

	let host: HTMLDivElement;
	let textures = $state<KitTextures | null>(null);
	let destroyed = false;

	onMount(() => {
		createKitTextures()
			.then((t) => {
				if (destroyed) return disposeKitTextures(t);
				textures = t;
			})
			.catch(onfail);
	});

	onDestroy(() => {
		destroyed = true;
		disposeKitTextures(textures);
	});

	// Report readiness once the canvas exists, and fall back if the GPU context is lost.
	$effect(() => {
		if (!textures) return;
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
</script>

<div bind:this={host} class="absolute inset-0">
	{#if textures}
		<Canvas
			{createRenderer}
			dpr={[1, 1.75]}
			renderMode="on-demand"
			toneMapping={NeutralToneMapping}
			shadows={PCFShadowMap}
		>
			<KitScene {kit} {textures} />
		</Canvas>
	{/if}
</div>
