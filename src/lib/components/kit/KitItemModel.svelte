<script lang="ts">
	import { T } from '@threlte/core';
	import { onDestroy, untrack } from 'svelte';
	import { Shape, ShapeGeometry } from 'three';
	import type { KitItemId } from '#lib/content.js';
	import { faces, type KitMaterials } from './materials';
	import { ITEM, U } from './dims';

	/** Geometry for each item, to scale. Local origin = bottom centre. */
	let { id, m }: { id: KitItemId; m: KitMaterials } = $props();

	/** A flat card with rounded corners, lying face up, UVs spanning the whole card. */
	function cardGeometry() {
		const { w, d } = ITEM.card;
		const r = 3.5 * U;
		const s = new Shape();
		s.moveTo(-w / 2 + r, -d / 2);
		s.lineTo(w / 2 - r, -d / 2);
		s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
		s.lineTo(w / 2, d / 2 - r);
		s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
		s.lineTo(-w / 2 + r, d / 2);
		s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
		s.lineTo(-w / 2, -d / 2 + r);
		s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
		const g = new ShapeGeometry(s, 4);
		const pos = g.getAttribute('position');
		const uv = g.getAttribute('uv');
		for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / d + 0.5);
		// A shape has one side: the card is two of them, back to back.
		const up = g.clone().rotateX(-Math.PI / 2).translate(0, 0.0012, 0);
		// Turned in its plane too, so the underside reads the same way up as the card box's back.
		const down = g.rotateZ(Math.PI).rotateX(Math.PI / 2);
		return { up, down };
	}
	const card = untrack(() => id) === 'cards' ? cardGeometry() : null;
	onDestroy(() => {
		card?.up.dispose();
		card?.down.dispose();
	});

	const { page, sheet, template, map, cardBox } = ITEM;
</script>

{#if id === 'profiles'}
	<!-- The Paper Profile booklet, closed: green cover, green back with the symbol -->
	<T.Mesh position={[0, 0.02, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.profileCover, ny: m.profileBack })}>
		<T.BoxGeometry args={[page.w, 0.04, page.d]} />
	</T.Mesh>
{:else if id === 'tokens'}
	<!-- Interest Token sticker sheet on its white liner -->
	<T.Mesh position={[0, 0.005, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.stickerSheet })}>
		<T.BoxGeometry args={[sheet.w, 0.01, sheet.d]} />
	</T.Mesh>
{:else if id === 'symbols'}
	<!-- A pad of Symbol System templates, the filled-in example on top -->
	<T.Mesh position={[0.012, 0.012, -0.01]} rotation={[0, -0.02, 0]} castShadow receiveShadow material={m.paper}>
		<T.BoxGeometry args={[template.w, 0.024, template.d]} />
	</T.Mesh>
	<T.Mesh position={[0, 0.028, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.template })}>
		<T.BoxGeometry args={[template.w, 0.008, template.d]} />
	</T.Mesh>
{:else if id === 'map'}
	<!-- The A3 map poster -->
	<T.Mesh position={[0, 0.003, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.map })}>
		<T.BoxGeometry args={[map.w, 0.006, map.d]} />
	</T.Mesh>
{:else if id === 'cards' && card}
	<!-- Practise Blackout Cards: the box, front up, with two cards beside it -->
	<T.Mesh position={[-0.52, cardBox.h / 2, 0]} castShadow receiveShadow material={faces(m.paper, { py: m.cardBoxFront, ny: m.cardBoxBack })}>
		<T.BoxGeometry args={[cardBox.w, cardBox.h, cardBox.d]} />
	</T.Mesh>
	<!-- one card face down (green back up), one face up -->
	<T.Group position={[0.58, 0.003, 0.12]} rotation={[0, -0.32, 0]}>
		<T.Mesh geometry={card.up} receiveShadow material={m.cardBack} />
		<T.Mesh geometry={card.down} material={m.cardFront2} />
	</T.Group>
	<T.Group position={[0.5, 0.008, -0.04]} rotation={[0, -0.08, 0]}>
		<T.Mesh geometry={card.up} castShadow receiveShadow material={m.cardFront} />
		<T.Mesh geometry={card.down} material={m.cardBack} />
	</T.Group>
{/if}
