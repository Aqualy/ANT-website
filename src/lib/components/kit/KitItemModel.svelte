<script lang="ts">
	import { T } from '@threlte/core';
	import type { KitItemId } from '#lib/content.js';
	import { faces, type KitMaterials } from './materials';

	/** Concept geometry for each item. Local origin = bottom centre. */
	let { id, m }: { id: KitItemId; m: KitMaterials } = $props();

	const SHEET = 0.012;
</script>

{#if id === 'language'}
	<!-- Three loose pictogram sheets plus a stapled booklet underneath -->
	<T.Mesh position={[0, 0.02, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.black })}>
		<T.BoxGeometry args={[0.82, 0.04, 0.92]} />
	</T.Mesh>
	{#each [0, 1, 2] as i (i)}
		<T.Mesh
			position={[0.012 * (i - 1), 0.04 + SHEET * (i + 0.5), 0.01 * (1 - i)]}
			rotation={[0, (i - 1) * 0.035, 0]}
			castShadow
			receiveShadow
			material={faces(m.paper, { py: i === 2 ? m.pictogramSheet : m.paper })}
		>
			<T.BoxGeometry args={[0.8, SHEET * 0.6, 0.9]} />
		</T.Mesh>
	{/each}
{:else if id === 'map'}
	<!-- Accordion-folded paper map: stacked panels with offset fold edges -->
	{#each [0, 1, 2, 3, 4] as i (i)}
		<T.Mesh
			position={[(i % 2 ? 1 : -1) * 0.006, 0.011 + i * 0.02, 0]}
			castShadow
			receiveShadow
			material={faces(i % 2 ? m.grey : m.white, { py: i === 4 ? m.mapCover : i % 2 ? m.grey : m.white })}
		>
			<T.BoxGeometry args={[0.7, 0.018, 0.9]} />
		</T.Mesh>
	{/each}
	<!-- folded edges -->
	{#each [0, 1, 2, 3] as i (i)}
		<T.Mesh
			position={[i % 2 ? -0.352 : 0.352, 0.021 + i * 0.02, 0]}
			rotation={[Math.PI / 2, 0, 0]}
			castShadow
			material={i % 2 ? m.grey : m.white}
		>
			<T.CylinderGeometry args={[0.012, 0.012, 0.9, 8, 1, false, i % 2 ? Math.PI : 0, Math.PI]} />
		</T.Mesh>
	{/each}
{:else if id === 'cards'}
	<!-- Deck of cards with a paper band -->
	<T.Mesh position={[0, 0.11, 0]} castShadow receiveShadow material={faces(m.cardEdge, { py: m.cardBack, ny: m.cardBack })}>
		<T.BoxGeometry args={[0.5, 0.22, 0.72]} />
	</T.Mesh>
	<T.Mesh position={[0, 0.11, 0.05]} castShadow receiveShadow material={m.black}>
		<T.BoxGeometry args={[0.512, 0.232, 0.12]} />
	</T.Mesh>
	<T.Mesh position={[0, 0.2265, 0.05]} receiveShadow material={m.green}>
		<T.BoxGeometry args={[0.512, 0.0015, 0.03]} />
	</T.Mesh>
{:else if id === 'profiles'}
	<!-- Stack of profile cards, slightly fanned -->
	{#each [0, 1, 2, 3, 4, 5] as i (i)}
		<T.Mesh
			position={[0.01 * Math.sin(i * 2.1), 0.009 + i * 0.016, 0.01 * Math.cos(i * 1.7)]}
			rotation={[0, (i - 2.5) * 0.02, 0]}
			castShadow
			receiveShadow
			material={faces(m.paper, { py: i === 5 ? m.profileCard : m.paper })}
		>
			<T.BoxGeometry args={[0.62, 0.014, 0.86]} />
		</T.Mesh>
	{/each}
{:else if id === 'tokens'}
	<!-- Small tray of round tokens + a sticker sheet -->
	<T.Group position={[-0.17, 0, 0]}>
		<T.Mesh position={[0, 0.01, 0]} receiveShadow castShadow material={m.white}>
			<T.BoxGeometry args={[0.5, 0.02, 0.84]} />
		</T.Mesh>
		{#each [[-0.24, 0], [0.24, 0]] as [x] (x)}
			<T.Mesh position={[x, 0.045, 0]} castShadow receiveShadow material={m.white}>
				<T.BoxGeometry args={[0.02, 0.07, 0.84]} />
			</T.Mesh>
		{/each}
		{#each [-0.41, 0.41] as z (z)}
			<T.Mesh position={[0, 0.045, z]} castShadow receiveShadow material={m.white}>
				<T.BoxGeometry args={[0.5, 0.07, 0.02]} />
			</T.Mesh>
		{/each}
		{#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
			{@const col = i % 3}
			{@const row = Math.floor(i / 3)}
			<T.Mesh
				position={[-0.14 + col * 0.14, 0.035 + (i % 4 === 0 ? 0.022 : 0), -0.27 + row * 0.18]}
				rotation={[0, i * 0.7, 0]}
				castShadow
				receiveShadow
				material={i % 3 === 0 ? [m.black, m.tokenFace, m.black] : i % 3 === 1 ? m.black : [m.white, m.green, m.white]}
			>
				<T.CylinderGeometry args={[0.06, 0.06, 0.024, 28]} />
			</T.Mesh>
		{/each}
	</T.Group>
	<T.Mesh position={[0.27, 0.005, 0]} rotation={[0, 0.05, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.stickerSheet })}>
		<T.BoxGeometry args={[0.34, 0.01, 0.68]} />
	</T.Mesh>
{:else if id === 'signage'}
	<!-- Compact stack of folded signs; the top one is printed -->
	{#each [0, 1, 2] as i (i)}
		<T.Mesh
			position={[0.008 * (i - 1), 0.02 + i * 0.04, 0.006 * (1 - i)]}
			castShadow
			receiveShadow
			material={faces(i === 2 ? m.green : m.black, { py: i === 2 ? m.signage : m.black })}
		>
			<T.BoxGeometry args={[0.85, 0.038, 0.6]} />
		</T.Mesh>
	{/each}
	<!-- fold spine -->
	<T.Mesh position={[0, 0.06, 0.3]} rotation={[0, 0, Math.PI / 2]} castShadow material={m.green}>
		<T.CylinderGeometry args={[0.06, 0.06, 0.85, 12, 1, false, 0, Math.PI]} />
	</T.Mesh>
{/if}
