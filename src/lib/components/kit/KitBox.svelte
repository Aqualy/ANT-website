<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { Group } from 'three';
	import { faces, type KitMaterials } from './materials';
	import { BD, BH, BW, INSERT_H, LD, LH, LID_OPEN_ANGLE, LID_TOP_Y, LW, WALL, damp } from './dims';

	let {
		m,
		open,
		instant,
		onboxclick
	}: { m: KitMaterials; open: boolean; instant: boolean; onboxclick?: () => void } = $props();

	const { invalidate } = useThrelte();

	let lid = $state<Group>();
	let animating = $state(false);
	const target = $derived(open ? LID_OPEN_ANGLE : 0);

	$effect(() => {
		void target;
		if (!lid) return;
		if (instant) {
			lid.rotation.x = target;
			invalidate();
		} else {
			animating = true;
		}
	});

	useTask(
		(dt) => {
			if (!lid) return;
			lid.rotation.x = damp(lid.rotation.x, target, 5.5, Math.min(dt, 0.05));
			if (Math.abs(lid.rotation.x - target) < 0.0015) {
				lid.rotation.x = target;
				animating = false;
			}
			invalidate();
		},
		{ autoInvalidate: false, running: () => animating }
	);

	const ext = $derived(m.black); // exterior
	const inner = $derived(m.grey); // interior
	const iw = BW - 2 * WALL;
	const id = BD - 2 * WALL;
</script>

<!-- Base tray -->
<T.Group onclick={(e: { stopPropagation: () => void }) => { if (onboxclick) { e.stopPropagation(); onboxclick(); } }}>
	<!-- Floor sits between the walls so no faces are coplanar (avoids z-fighting) -->
	<T.Mesh position={[0, WALL / 2, 0]} castShadow receiveShadow material={faces(ext, { py: inner })}>
		<T.BoxGeometry args={[iw, WALL, id]} />
	</T.Mesh>
	<!-- front / back walls -->
	<T.Mesh position={[0, BH / 2, BD / 2 - WALL / 2]} castShadow receiveShadow material={faces(ext, { pz: m.boxFront, nz: inner })}>
		<T.BoxGeometry args={[BW, BH, WALL]} />
	</T.Mesh>
	<T.Mesh position={[0, BH / 2, -BD / 2 + WALL / 2]} castShadow receiveShadow material={faces(ext, { pz: inner })}>
		<T.BoxGeometry args={[BW, BH, WALL]} />
	</T.Mesh>
	<!-- side walls -->
	<T.Mesh position={[-BW / 2 + WALL / 2, BH / 2, 0]} castShadow receiveShadow material={faces(ext, { px: inner })}>
		<T.BoxGeometry args={[WALL, BH, id]} />
	</T.Mesh>
	<T.Mesh position={[BW / 2 - WALL / 2, BH / 2, 0]} castShadow receiveShadow material={faces(ext, { nx: inner })}>
		<T.BoxGeometry args={[WALL, BH, id]} />
	</T.Mesh>

	<!-- Grey card insert with low white dividers -->
	<T.Mesh position={[0, WALL + INSERT_H / 2, 0]} receiveShadow material={inner}>
		<T.BoxGeometry args={[iw, INSERT_H, id]} />
	</T.Mesh>
	<T.Mesh position={[0, WALL + INSERT_H + 0.05, 0]} castShadow receiveShadow material={m.white}>
		<T.BoxGeometry args={[iw, 0.1, 0.025]} />
	</T.Mesh>
	{#each [-1, 1] as s (s)}
		<T.Mesh position={[(s * iw) / 6, WALL + INSERT_H + 0.05, 0]} castShadow receiveShadow material={m.white}>
			<T.BoxGeometry args={[0.025, 0.1, id]} />
		</T.Mesh>
	{/each}
</T.Group>

<!-- Hinged telescoping lid: pivot on the back top edge -->
<T.Group position={[0, LID_TOP_Y, -LD / 2]} bind:ref={lid}>
	<T.Group onclick={(e: { stopPropagation: () => void }) => { if (onboxclick) { e.stopPropagation(); onboxclick(); } }}>
		<!-- Top panel sits between the walls so no faces are coplanar (avoids z-fighting) -->
		<T.Mesh position={[0, -WALL / 2, LD / 2]} castShadow receiveShadow material={faces(ext, { py: m.lidTop, ny: m.lidInside })}>
			<T.BoxGeometry args={[LW - 2 * WALL, WALL, LD - 2 * WALL]} />
		</T.Mesh>
		<T.Mesh position={[0, -LH / 2, LD - WALL / 2]} castShadow receiveShadow material={faces(ext, { py: m.green, pz: m.lidFront, nz: inner })}>
			<T.BoxGeometry args={[LW, LH, WALL]} />
		</T.Mesh>
		<T.Mesh position={[0, -LH / 2, WALL / 2]} castShadow receiveShadow material={faces(ext, { pz: inner })}>
			<T.BoxGeometry args={[LW, LH, WALL]} />
		</T.Mesh>
		<T.Mesh position={[-LW / 2 + WALL / 2, -LH / 2, LD / 2]} castShadow receiveShadow material={faces(ext, { px: inner })}>
			<T.BoxGeometry args={[WALL, LH, LD - 2 * WALL]} />
		</T.Mesh>
		<T.Mesh position={[LW / 2 - WALL / 2, -LH / 2, LD / 2]} castShadow receiveShadow material={faces(ext, { nx: inner })}>
			<T.BoxGeometry args={[WALL, LH, LD - 2 * WALL]} />
		</T.Mesh>
	</T.Group>
</T.Group>
