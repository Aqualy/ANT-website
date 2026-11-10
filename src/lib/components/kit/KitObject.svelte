<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { useCursor } from '@threlte/extras';
	import type { Group } from 'three';
	import type { Snippet } from 'svelte';
	import { FLOOR, damp, homes, type FocusPose } from './dims';
	import type { KitItemId } from '#lib/content.js';


	let {
		id,
		focused,
		interactive,
		instant,
		focus,
		onselect,
		children
	}: {
		id: KitItemId;
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

	const [hx, hz, hry] = $derived(homes[id]);

	const goal = $derived.by(() => {
		if (focused)
			return { x: focus.position[0], y: focus.position[1], z: focus.position[2], rx: focus.tiltX, ry: 0, s: focus.scale };
		return { x: hx, y: FLOOR + (hovered && interactive ? 0.07 : 0), z: hz, rx: 0, ry: hry, s: 1 };
	});

	function apply(g: Group, k: number, dt: number) {
		const t = goal;
		if (k >= 1) {
			g.position.set(t.x, t.y, t.z);
			g.rotation.set(t.rx, t.ry, 0);
			g.scale.setScalar(t.s);
			return true;
		}
		g.position.set(damp(g.position.x, t.x, k, dt), damp(g.position.y, t.y, k, dt), damp(g.position.z, t.z, k, dt));
		g.rotation.x = damp(g.rotation.x, t.rx, k, dt);
		g.rotation.y = damp(g.rotation.y, t.ry, k, dt);
		g.scale.setScalar(damp(g.scale.x, t.s, k, dt));
		const err =
			Math.abs(g.position.x - t.x) + Math.abs(g.position.y - t.y) + Math.abs(g.position.z - t.z) +
			Math.abs(g.rotation.x - t.rx) + Math.abs(g.rotation.y - t.ry) + Math.abs(g.scale.x - t.s);
		return err < 0.002;
	}

	// Initial placement without animation.
	$effect(() => {
		if (ref && !ref.userData.placed) {
			ref.userData.placed = true;
			apply(ref, 1, 0);
			invalidate();
		}
	});

	$effect(() => {
		void goal;
		if (!ref) return;
		if (instant) {
			apply(ref, 1, 0);
			invalidate();
		} else animating = true;
	});

	useTask(
		(dt) => {
			if (!ref) return;
			if (apply(ref, 7, Math.min(dt, 0.05))) {
				apply(ref, 1, 0);
				animating = false;
			}
			invalidate();
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
