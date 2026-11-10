<script lang="ts">
	import type { DiagramNode } from '#lib/content.js';

	/** Simple geometric pictograms drawn in a 100 x 100 box centred on 0,0. Illustrative only. */
	let { shape, id }: { shape: DiagramNode['shape']; id: string } = $props();
</script>

<g fill="none" stroke="#000" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
	{#if id === 'neighbours'}
		<circle cx="-20" cy="-14" r="9" fill="#000" stroke="none" />
		<path d="M-36 14 a16 16 0 0 1 32 0" fill="#000" stroke="none" />
		<circle cx="20" cy="-14" r="9" fill="#000" stroke="none" />
		<path d="M4 14 a16 16 0 0 1 32 0" fill="#000" stroke="none" />
		<circle cx="0" cy="2" r="10" fill="#000" stroke="#fff" stroke-width="3" />
		<path d="M-19 32 a19 19 0 0 1 38 0 Z" fill="#000" stroke="#fff" stroke-width="3" />
	{:else if shape === 'circle'}
		<circle cx="0" cy="-12" r="12" fill="#000" stroke="none" />
		<path d="M-22 26 a22 22 0 0 1 44 0 Z" fill="#000" stroke="none" />
	{:else if shape === 'square'}
		<path d="M-26 30 V-4 L0 -26 L26 -4 V30 Z" />
		<rect x="-8" y="8" width="16" height="22" fill="#000" stroke="none" />
	{:else if shape === 'sheet'}
		<path d="M-20 -30 H10 L22 -18 V30 H-20 Z" />
		<path d="M-10 -10 H12 M-10 2 H12 M-10 14 H4" />
	{:else if shape === 'arrow'}
		<path d="M0 30 V-4" />
		<path d="M-24 -30 H14 L26 -18 L14 -6 H-24 Z" fill="#000" />
	{:else if shape === 'pin'}
		<path d="M0 32 C-6 18 -22 6 -22 -8 a22 22 0 0 1 44 0 C22 6 6 18 0 32 Z" fill="#000" />
		<circle cx="0" cy="-8" r="8" fill="#fff" stroke="none" />
	{/if}
</g>
