<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import type { Group } from 'three';
	import { faces, type KitMaterials } from './materials';
	import { BD, BH, BW, LID_OPEN_ANGLE, WALL, damp } from './dims';

	/** The real mailer box: white board, printed lid, green front, and a tuck flap on the lid. */
	let {
		m,
		open,
		instant,
		onboxclick
	}: { m: KitMaterials; open: boolean; instant: boolean; onboxclick?: () => void } = $props();

	const { invalidate } = useThrelte();

	let lid = $state<Group>();
	let animating = $state(false);
	/** Seconds to wait before the lid moves: on closing, the items go back in first. */
	let wait = 0;
	const target = $derived(open ? LID_OPEN_ANGLE : 0);

	$effect(() => {
		void target;
		if (!lid) return;
		if (instant) {
			lid.rotation.x = target;
			invalidate();
		} else {
			wait = target === 0 ? 0.75 : 0;
			animating = true;
		}
	});

	useTask(
		(dt) => {
			if (!lid) return;
			invalidate();
			if (wait > 0) {
				wait -= dt;
				return;
			}
			lid.rotation.x = damp(lid.rotation.x, target, 5.5, Math.min(dt, 0.05));
			if (Math.abs(lid.rotation.x - target) < 0.0015) {
				lid.rotation.x = target;
				animating = false;
			}
		},
		{ autoInvalidate: false, running: () => animating }
	);

	const ext = $derived(m.white); // printed board outside
	const inner = $derived(m.grey); // unprinted board inside
	const iw = BW - 2 * WALL;
	const id = BD - 2 * WALL;
	const FLAP = BH * 0.6;

	const click = (e: { stopPropagation: () => void }) => {
		if (onboxclick) {
			e.stopPropagation();
			onboxclick();
		}
	};
</script>

<!-- Base tray -->
<T.Group onclick={click}>
	<!-- Floor sits between the walls so no faces are coplanar (avoids z-fighting) -->
	<T.Mesh position={[0, WALL / 2, 0]} castShadow receiveShadow material={faces(ext, { py: inner })}>
		<T.BoxGeometry args={[iw, WALL, id]} />
	</T.Mesh>
	<!-- front (green, with the thumb notch) and back (ADAPTIVE NETWORK OF TRUST) -->
	<T.Mesh position={[0, BH / 2, BD / 2 - WALL / 2]} castShadow receiveShadow material={faces(ext, { pz: m.boxFront, nz: inner })}>
		<T.BoxGeometry args={[BW, BH, WALL]} />
	</T.Mesh>
	<T.Mesh position={[0, BH / 2, -BD / 2 + WALL / 2]} castShadow receiveShadow material={faces(ext, { nz: m.boxBack, pz: inner })}>
		<T.BoxGeometry args={[BW, BH, WALL]} />
	</T.Mesh>
	<!-- side walls -->
	<T.Mesh position={[-BW / 2 + WALL / 2, BH / 2, 0]} castShadow receiveShadow material={faces(ext, { px: inner })}>
		<T.BoxGeometry args={[WALL, BH, id]} />
	</T.Mesh>
	<T.Mesh position={[BW / 2 - WALL / 2, BH / 2, 0]} castShadow receiveShadow material={faces(ext, { nx: inner })}>
		<T.BoxGeometry args={[WALL, BH, id]} />
	</T.Mesh>
</T.Group>

<!-- Hinged lid: pivot on the back top edge -->
<T.Group position={[0, BH, -BD / 2]} bind:ref={lid}>
	<T.Group onclick={click}>
		<T.Mesh position={[0, WALL / 2, BD / 2]} castShadow receiveShadow material={faces(ext, { py: m.lidTop, ny: inner })}>
			<T.BoxGeometry args={[BW + 0.008, WALL, BD + 0.004]} />
		</T.Mesh>
		<!-- tuck flap: tucks in behind the front wall -->
		<T.Mesh position={[0, -FLAP / 2, BD - WALL * 1.6]} castShadow receiveShadow material={faces(inner, { pz: m.green })}>
			<T.BoxGeometry args={[iw - 0.04, FLAP, WALL * 0.6]} />
		</T.Mesh>
	</T.Group>
</T.Group>
