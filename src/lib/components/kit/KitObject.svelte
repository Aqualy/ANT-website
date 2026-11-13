<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { useCursor } from '@threlte/extras';
	import type { Group } from 'three';
	import type { Snippet } from 'svelte';
	import { laid, packed, span, type FocusPose } from './dims';
	import type { KitItemId } from '#lib/content.js';

	/**
	 * One item of the kit. Packed in the box while it's closed, laid out on the
	 * table once it's open, lifted toward the camera when inspected. Moves
	 * between those in an arc, so nothing passes through the box walls.
	 */
	let {
		id,
		index,
		out,
		focused,
		interactive,
		instant,
		focus,
		onselect,
		children
	}: {
		id: KitItemId;
		/** Order in which items leave the box. */
		index: number;
		/** The kit is open: lie on the table instead of in the box. */
		out: boolean;
		focused: boolean;
		interactive: boolean;
		instant: boolean;
		focus: FocusPose;
		onselect: (id: KitItemId) => void;
		children: Snippet;
	} = $props();

	const { invalidate } = useThrelte();
	const { onPointerEnter, onPointerLeave } = useCursor('pointer');

	let ref = $state<Group>();
	let hovered = $state(false);
	let animating = $state(false);

	type Pose = { x: number; y: number; z: number; rx: number; ry: number; s: number };

	const goal = $derived.by((): Pose => {
		if (focused)
			return { x: focus.position[0], y: focus.position[1], z: focus.position[2], rx: focus.tiltX, ry: 0, s: focus.scale / span[id] };
		if (!out) {
			const [x, y, z, ry, s = 1] = packed[id];
			return { x, y, z, rx: 0, ry, s };
		}
		const [x, z, ry] = laid[id];
		return { x, y: hovered && interactive ? 0.08 : 0, z, rx: 0, ry, s: 1 };
	});

	let from: Pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, s: 1 };
	let to: Pose = from;
	let t = 1;
	let duration = 0.3;
	let lift = 0;
	let wait = 0;
	let wasOut = false;

	function set(g: Group, p: Pose) {
		g.position.set(p.x, p.y, p.z);
		g.rotation.set(p.rx, p.ry, 0);
		g.scale.setScalar(p.s);
	}

	const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

	$effect(() => {
		const g = goal;
		const leaving = out !== wasOut;
		wasOut = out;
		if (!ref) return;
		if (instant || !ref.userData.placed) {
			ref.userData.placed = true;
			set(ref, g);
			t = 1;
			animating = false;
			invalidate();
			return;
		}
		from = {
			x: ref.position.x,
			y: ref.position.y,
			z: ref.position.z,
			rx: ref.rotation.x,
			ry: ref.rotation.y,
			s: ref.scale.x
		};
		to = g;
		const dist = Math.hypot(to.x - from.x, to.z - from.z);
		const far = dist > 0.4 || Math.abs(to.y - from.y) > 0.4;
		duration = far ? 0.75 + Math.min(dist, 4) * 0.06 : 0.25;
		// Out of (or into) the box: up over the wall first.
		lift = far && !focused && (leaving || !out) ? 1.1 : far ? 0.25 : 0;
		// Leaving the box waits for the lid; going back in, the last one out goes in first.
		wait = leaving ? (out ? 0.3 + index * 0.08 : (4 - index) * 0.06) : 0;
		t = 0;
		animating = true;
	});

	useTask(
		(dt) => {
			if (!ref) return;
			invalidate();
			if (wait > 0) {
				wait -= dt;
				return;
			}
			t = Math.min(1, t + Math.min(dt, 0.05) / duration);
			const e = t * t * (3 - 2 * t);
			ref.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) + Math.sin(t * Math.PI) * lift, lerp(from.z, to.z, e));
			ref.rotation.set(lerp(from.rx, to.rx, e), lerp(from.ry, to.ry, e), 0);
			ref.scale.setScalar(lerp(from.s, to.s, e));
			if (t >= 1) {
				set(ref, to);
				animating = false;
			}
		},
		{ autoInvalidate: false, running: () => animating }
	);
</script>

<T.Group
	bind:ref
	name={id}
	onclick={(e: { stopPropagation: () => void }) => {
		if (!interactive) return;
		e.stopPropagation();
		onselect(id);
	}}
	onpointerenter={() => {
		if (!interactive) return;
		hovered = true;
		onPointerEnter();
	}}
	onpointerleave={() => {
		hovered = false;
		onPointerLeave();
	}}
>
	{@render children()}
</T.Group>
