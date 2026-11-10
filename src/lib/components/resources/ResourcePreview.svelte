<script lang="ts">
	import type { Resource } from '#lib/content.js';

	/** Simple concept thumbnails in the ANT palette. Not final artwork. */
	let { kind }: { kind: Resource['preview'] } = $props();
</script>

<svg viewBox="0 0 240 170" class="block h-auto w-full" aria-hidden="true">
	<rect width="240" height="170" fill="#ffffff" />
	{#if kind === 'poster'}
		<g transform="rotate(-3 120 85)">
			<rect x="72" y="14" width="96" height="140" fill="#c5d92f" stroke="#000" stroke-width="2" />
			<circle cx="98" cy="46" r="16" fill="#000" />
			<circle cx="140" cy="70" r="13" fill="#000" />
			<path d="M98 46 L140 70" stroke="#000" stroke-width="10" />
			<rect x="84" y="104" width="72" height="8" fill="#000" />
			<rect x="84" y="118" width="52" height="8" fill="#000" />
		</g>
	{:else if kind === 'pictograms'}
		{#each [0, 1, 2, 3] as c (c)}
			{#each [0, 1] as r (r)}
				<rect x={34 + c * 46} y={34 + r * 54} width="38" height="38" fill={(c + r) % 3 === 0 ? '#c5d92f' : '#fff'} stroke="#000" stroke-width="2" />
			{/each}
		{/each}
		<circle cx="53" cy="53" r="10" />
		<path d="M99 43 l11 20 h-22z" />
		<rect x="137" y="45" width="16" height="16" />
		<path d="M175 53 h14 v-7 l10 7 -10 7 v-7" stroke="#000" stroke-width="4" fill="none" />
		<circle cx="53" cy="107" r="6" /><circle cx="63" cy="107" r="6" />
		<path d="M99 97 l10 10 -10 10 -10 -10z" />
		<circle cx="145" cy="107" r="10" fill="none" stroke="#000" stroke-width="4" />
		<rect x="181" y="99" width="8" height="16" />
	{:else if kind === 'map'}
		<rect x="40" y="18" width="160" height="134" fill="#fff" stroke="#000" stroke-width="2" />
		<path d="M40 70 L200 62 M40 112 L200 118 M90 18 L96 152 M150 18 L144 152" stroke="#dddddd" stroke-width="9" />
		<path d="M93 66 L147 115" stroke="#000" stroke-width="3" stroke-dasharray="6 5" />
		<circle cx="93" cy="66" r="9" fill="#c5d92f" stroke="#000" stroke-width="3" />
		<circle cx="147" cy="115" r="9" fill="#fff" stroke="#000" stroke-width="3" />
	{:else if kind === 'cards'}
		<rect x="70" y="30" width="70" height="100" fill="#fff" stroke="#000" stroke-width="2" transform="rotate(-12 105 80)" />
		<rect x="100" y="34" width="70" height="100" fill="#c5d92f" stroke="#000" stroke-width="2" transform="rotate(6 135 84)" />
		<g transform="rotate(6 135 84)"><rect x="112" y="98" width="46" height="6" /><rect x="112" y="110" width="30" height="6" /><circle cx="135" cy="66" r="14" /></g>
	{:else if kind === 'profile'}
		<rect x="74" y="12" width="92" height="146" fill="#fff" stroke="#000" stroke-width="2" />
		<rect x="74" y="12" width="92" height="18" />
		<rect x="84" y="40" width="30" height="34" fill="#dddddd" stroke="#000" stroke-width="2" />
		<rect x="120" y="46" width="36" height="4" /><rect x="120" y="62" width="36" height="4" />
		{#each [0, 1, 2, 3] as i (i)}
			<circle cx={92 + i * 18} cy="92" r="6" fill={i < 2 ? '#c5d92f' : '#fff'} stroke="#000" stroke-width="2" />
		{/each}
		{#each [0, 1, 2, 3] as i (i)}<rect x="84" y={110 + i * 10} width="72" height="3" fill="#dddddd" />{/each}
	{:else if kind === 'tokens'}
		{#each [0, 1, 2, 3, 4] as c (c)}
			{#each [0, 1] as r (r)}
				<circle cx={52 + c * 34} cy={62 + r * 46} r="14" fill={(c + r) % 2 ? '#000' : '#c5d92f'} stroke="#000" stroke-width="2" />
			{/each}
		{/each}
	{:else if kind === 'guide'}
		<rect x="62" y="22" width="58" height="126" fill="#fff" stroke="#000" stroke-width="2" />
		<rect x="120" y="22" width="58" height="126" fill="#fff" stroke="#000" stroke-width="2" />
		{#each [0, 1, 2, 3] as i (i)}
			<rect x="70" y={34 + i * 28} width="12" height="12" fill={i === 0 ? '#c5d92f' : '#000'} />
			<rect x="88" y={37 + i * 28} width="24" height="4" />
			<rect x="128" y={36 + i * 28} width="42" height="4" fill="#dddddd" />
		{/each}
	{/if}
</svg>
