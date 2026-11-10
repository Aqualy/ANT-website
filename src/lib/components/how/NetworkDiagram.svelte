<script lang="ts">
	import { diagramLinks, diagramNodes, type DiagramNodeId } from '#lib/content.js';
	import NodeIcon from './NodeIcon.svelte';

	type Layout = 'wide' | 'tall';

	let {
		layout,
		selected,
		activeLink,
		onselect
	}: {
		layout: Layout;
		selected: DiagramNodeId | null;
		activeLink: [DiagramNodeId, DiagramNodeId] | null;
		onselect: (id: DiagramNodeId) => void;
	} = $props();

	// Portrait positions for narrow screens; the wide layout uses x/y from content.ts.
	const tall: Record<DiagramNodeId, [number, number]> = {
		printed: [300, 95],
		residents: [115, 320],
		wayfinding: [485, 320],
		hub: [300, 520],
		neighbours: [115, 745],
		meeting: [485, 745]
	};

	const W = $derived(layout === 'wide' ? 1000 : 600);
	const H = $derived(layout === 'wide' ? 600 : 860);
	const pos = (id: DiagramNodeId): [number, number] => {
		if (layout === 'tall') return tall[id];
		const n = diagramNodes.find((d) => d.id === id)!;
		return [n.x, n.y];
	};

	const R = 58; // node disc radius
	const HIT = 150; // hit area size in diagram units

	const isActive = (a: DiagramNodeId, b: DiagramNodeId) =>
		!!activeLink && ((activeLink[0] === a && activeLink[1] === b) || (activeLink[0] === b && activeLink[1] === a));
</script>

<div class="relative w-full">
	<svg viewBox="0 0 {W} {H}" class="block h-auto w-full" aria-hidden="true">
		{#each diagramLinks as [a, b] (a + b)}
			{@const [x1, y1] = pos(a)}
			{@const [x2, y2] = pos(b)}
			<line
				{x1}
				{y1}
				{x2}
				{y2}
				stroke="#000"
				stroke-width={isActive(a, b) ? 10 : 3}
				stroke-dasharray={isActive(a, b) ? undefined : '2 10'}
				stroke-linecap="round"
			/>
		{/each}
		{#each diagramNodes as node (node.id)}
			{@const [x, y] = pos(node.id)}
			<g transform="translate({x} {y})">
				<circle r={R} fill={selected === node.id ? '#c5d92f' : '#fff'} stroke="#000" stroke-width="4" />
				<NodeIcon shape={node.shape} id={node.id} />
				<text y={R + 34} text-anchor="middle" font-size="26" font-weight="700" fill="#000" stroke="#fff" stroke-width="10" stroke-linejoin="round" paint-order="stroke">{node.title}</text>
			</g>
		{/each}
	</svg>

	<!-- Real buttons overlay the drawn nodes for mouse, touch and keyboard. -->
	{#each diagramNodes as node (node.id)}
		{@const [x, y] = pos(node.id)}
		<button
			type="button"
			class="absolute rounded-full"
			style="left:{((x - HIT / 2) / W) * 100}%; top:{((y - HIT / 2) / H) * 100}%; width:{(HIT / W) * 100}%; height:{((HIT + 30) / H) * 100}%"
			aria-pressed={selected === node.id}
			aria-controls="diagram-info"
			onclick={() => onselect(node.id)}
		>
			<span class="sr-only">{node.title}</span>
		</button>
	{/each}
</div>
