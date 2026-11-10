<script lang="ts">
	import { kitItems, type KitItemId } from '#lib/content.js';

	/** Static 2D top view of the open kit, shown when WebGL is unavailable. */
	let { selected, reason }: { selected: KitItemId | null; reason: string } = $props();

	const cells = kitItems.map((item, i) => ({
		n: i + 1,
		...item,
		x: 30 + (i % 3) * 180,
		y: 40 + Math.floor(i / 3) * 170
	}));
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
	<svg viewBox="0 0 600 400" class="h-auto w-full max-w-[34rem]" aria-hidden="true">
		<rect x="10" y="20" width="580" height="360" fill="#000" />
		<rect x="22" y="32" width="556" height="336" fill="#dddddd" />
		{#each cells as c (c.id)}
			<rect
				x={c.x}
				y={c.y}
				width="168"
				height="158"
				fill={selected === c.id ? '#c5d92f' : '#ffffff'}
				stroke="#000"
				stroke-width="3"
			/>
			<text x={c.x + 14} y={c.y + 34} font-size="26" font-weight="700" fill="#000">{c.n}</text>
			<foreignObject x={c.x + 10} y={c.y + 90} width="150" height="64">
				<p style="margin:0;font:700 17px/1.15 var(--font-sans);color:#000">{c.title}</p>
			</foreignObject>
		{/each}
	</svg>
	<p class="max-w-[30rem] text-center text-sm">
		{reason} Choose an item from the list to read about it.
	</p>
</div>
