<script lang="ts">
	/**
	 * Drives the shared world through the chapters: damps the world state toward
	 * the current chapter's targets, glides the camera to its shot and projects
	 * the HTML labels. Renders on demand and stops completely once settled.
	 */
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onDestroy, untrack } from 'svelte';
	import { Vector3, type PerspectiveCamera } from 'three';
	import { WORLD_KEYS, restState, type WorldState } from '#lib/components/world/state.js';
	import { createWorld } from '#lib/components/world/world.js';
	import { chapters, type Chapter } from './chapters.js';
	import type { ExploreState } from './exploreState.svelte';

	let {
		explore,
		inset,
		place
	}: {
		explore: ExploreState;
		/** Parts of the canvas covered by the page's chip row and text panel; the shot is framed in what is left. */
		inset: { top: number; right: number; bottom: number };
		place: (id: string, x: number, y: number, width: number) => void;
	} = $props();

	const { invalidate, size, renderer } = useThrelte();
	const world = createWorld(renderer);
	onDestroy(() => world.dispose());

	const FOV = 30;
	const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
	const RAD = Math.PI / 180;
	/** How fast each channel closes in on its target (per second). Unlisted: 6. */
	const RATE: Partial<Record<keyof WorldState, number>> = {
		network: 2.4,
		green: 1.6,
		kitFan: 4,
		pStory: 3,
		walkNoor: 2.2,
		sam: 2.2,
		handIn: 3.5,
		flip: 3.5,
		match: 2.6,
		cover: 3,
		slip: 3,
		formDraw: 1.6,
		toBoard: 3.5,
		pins: 4,
		chains: 1.3,
		copies: 1.3,
		fibre: 2.2
	};

	let camera = $state<PerspectiveCamera>();
	let animating = $state(false);

	let ch: Chapter = chapters[0];
	/** Seconds into the chapter's choreography; Infinity = go for the settled state. */
	let t = Infinity;
	/** Cut instead of easing (first frame, reduced motion). */
	let hard = true;
	const cur = restState();
	const goal = restState();
	const camPos = new Vector3();
	const camTarget = new Vector3();
	const goalPos = new Vector3();
	const goalTarget = new Vector3();
	const p = new Vector3();
	let lastShown = '';

	function resolve(c: Chapter, time: number, out: WorldState) {
		for (const k of WORLD_KEYS) out[k] = 0;
		Object.assign(out, c.targets(time, explore.ui));
	}

	function kick() {
		animating = true;
		explore.busy = true;
		invalidate();
	}

	// A navigation: start the new chapter.
	$effect(() => {
		void explore.seq;
		untrack(() => {
			ch = chapters[explore.index];
			if (explore.mode === 'replay') {
				const before = chapters[explore.index - 1];
				if (before) resolve(before, Infinity, cur);
				else Object.assign(cur, restState());
			}
			t = explore.mode === 'settle' || explore.reduced ? Infinity : 0;
			if (explore.reduced) hard = true;
			kick();
		});
	});

	// Anything else that changes the picture.
	$effect(() => {
		void explore.choice;
		void explore.pageTurned;
		void $size;
		void inset;
		void camera;
		if (explore.reduced) hard = true;
		untrack(kick);
	});

	useTask(
		(dt) => {
			if (!camera) return;
			const d = Math.min(dt, 0.05);
			if (t !== Infinity) {
				t += d;
				if (t > ch.duration) t = Infinity;
			}
			let moving = t !== Infinity;

			/* world */
			resolve(ch, t, goal);
			for (const k of WORLD_KEYS) {
				if (hard) cur[k] = goal[k];
				else if (cur[k] !== goal[k]) {
					cur[k] += (goal[k] - cur[k]) * (1 - Math.exp(-(RATE[k] ?? 6) * d));
					if (Math.abs(cur[k] - goal[k]) < 0.002) cur[k] = goal[k];
					else moving = true;
				}
			}
			world.apply(cur);

			/* camera */
			const w = Math.max(1, $size.width);
			const h = Math.max(1, $size.height);
			// Frame the subject in the free part of the canvas, and shift the picture so that part is centred.
			const freeW = Math.max(1, w - inset.right);
			const freeH = Math.max(1, h - inset.top - inset.bottom);
			const shot = ch.shot(t, freeW < freeH);
			const dist = Math.max(shot.h / 2 / (TAN * (freeH / h)), shot.w / 2 / (TAN * (freeW / h)));
			camera.setViewOffset(w, h, inset.right / 2, (inset.bottom - inset.top) / 2, w, h);
			const az = shot.az * RAD;
			const el = shot.el * RAD;
			goalTarget.set(...shot.target);
			goalPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(goalTarget);
			if (hard) {
				camPos.copy(goalPos);
				camTarget.copy(goalTarget);
			} else {
				const k = 1 - Math.exp(-3.4 * d);
				camPos.lerp(goalPos, k);
				camTarget.lerp(goalTarget, k);
				if (camPos.distanceTo(goalPos) < 0.01 && camTarget.distanceTo(goalTarget) < 0.01) {
					camPos.copy(goalPos);
					camTarget.copy(goalTarget);
				} else moving = true;
			}
			camera.position.copy(camPos);
			camera.lookAt(camTarget);
			camera.updateMatrixWorld();
			for (const b of world.billboards) b.quaternion.copy(camera.quaternion);

			/* labels */
			const ui = explore.ui;
			const shown: string[] = [];
			const lit: string[] = [];
			for (const l of ch.labels) {
				if (t < (l.from ?? 0) || (l.to !== undefined && !(t < l.to)) || (l.when && !l.when(ui))) continue;
				shown.push(l.id);
				if (typeof l.on === 'function' ? l.on(t, ui) : l.on) lit.push(l.id);
				if (l.anchor === 'stage') continue;
				p.copy(world.anchors[l.anchor]).project(camera);
				place(l.id, (p.x * 0.5 + 0.5) * w, (-p.y * 0.5 + 0.5) * h, w);
			}
			const key = `${ch.id}|${shown.join()}|${lit.join()}`;
			if (key !== lastShown) {
				lastShown = key;
				explore.shown = shown;
				explore.lit = lit;
			}

			hard = false;
			if (!moving) {
				animating = false;
				explore.busy = false;
			}
			invalidate();
		},
		{ autoInvalidate: false, running: () => animating }
	);

	// For checking that the page really is idle: /explore?debug
	if (new URLSearchParams(location.search).has('debug')) {
		(window as unknown as Record<string, unknown>).__explore = {
			frames: () => renderer.info.render.frame,
			busy: () => animating
		};
	}
</script>

<T.PerspectiveCamera makeDefault fov={FOV} near={0.5} far={300} bind:ref={camera} />
<T is={world.group} />
