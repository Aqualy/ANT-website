<script lang="ts">
	/**
	 * Drives the shared world through the chapters: damps the world state toward
	 * the current chapter's targets, glides the camera to its shot and projects
	 * the HTML labels. Renders on demand and stops completely once settled.
	 */
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onDestroy, untrack } from 'svelte';
	import { Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
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
		/** Parts of the canvas covered by the chapter text and the controls; the shot is framed in what is left. */
		inset: { top: number; left: number; right: number; bottom: number };
		place: (id: string, x: number, y: number, width: number) => void;
	} = $props();

	const { invalidate, size, renderer } = useThrelte();
	const world = createWorld(renderer);
	onDestroy(() => world.dispose());

	const KIT_SUBJECTS = ['kitMap', 'kitProfile', 'kitTokens', 'kitSymbols', 'kitCards'] as const;
	const FOV = 30;
	const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
	const RAD = Math.PI / 180;
	/** How fast each channel closes in on its target (per second). Unlisted: 6. */
	const RATE: Partial<Record<keyof WorldState, number>> = {
		network: 2.4,
		town: 3,
		home: 4,
		book: 5,
		boardUp: 5,
		east: 3,
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
	const focusAt = new Vector3();
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
		void explore.focus;
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
			// Looking closely at one print from the kit: the others step away, so nothing peeks in around it.
			if (explore.focus?.startsWith('kit'))
				for (const id of KIT_SUBJECTS) if (id !== explore.focus) world.subjects[id].obj.parent!.visible = false;

			/* camera */
			const w = Math.max(1, $size.width);
			const h = Math.max(1, $size.height);
			// Frame the subject in the free part of the canvas, and shift the picture so that part is centred.
			const freeW = Math.max(1, w - inset.left - inset.right);
			const freeH = Math.max(1, h - inset.top - inset.bottom);
			let shot = ch.shot(t, freeW < freeH);
			// Looking closer: move in until the print fills the free part of the view.
			const sized = explore.focus ? world.locate(explore.focus, focusAt) : null;
			if (explore.focus && sized) {
				const sub = world.subjects[explore.focus];
				shot = {
					target: [focusAt.x, focusAt.y, focusAt.z],
					az: sub.az ?? shot.az,
					el: sub.el ?? shot.el,
					w: sized.w * 1.08,
					h: sized.h * 1.08
				};
			}
			const dist = Math.max(shot.h / 2 / (TAN * (freeH / h)), shot.w / 2 / (TAN * (freeW / h)));
			camera.setViewOffset(w, h, (inset.right - inset.left) / 2, (inset.bottom - inset.top) / 2, w, h);
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
				// Close up, the print speaks for itself.
				if (explore.focus) break;
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

	/* ---------- look closer: click or tap a print; again, or anywhere else, to step back ---------- */
	const ray = new Raycaster();
	const ndc = new Vector2();
	function hit(e: PointerEvent) {
		if (!camera) return null;
		const r = renderer.domElement.getBoundingClientRect();
		ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		ray.setFromCamera(ndc, camera);
		const id = world.pick(ray);
		return id && ch.closer?.some((c) => c.id === id) ? id : null;
	}
	$effect(() => {
		const el = renderer.domElement;
		let down: { x: number; y: number } | null = null;
		const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
		const onUp = (e: PointerEvent) => {
			if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
			down = null;
			const id = hit(e);
			explore.focus = explore.focus ? null : id;
		};
		let queued = false;
		const onMove = (e: PointerEvent) => {
			if (queued || e.pointerType !== 'mouse') return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				el.style.cursor = explore.focus ? 'zoom-out' : hit(e) ? 'zoom-in' : '';
			});
		};
		el.addEventListener('pointerdown', onDown);
		el.addEventListener('pointerup', onUp);
		el.addEventListener('pointermove', onMove);
		return () => {
			el.removeEventListener('pointerdown', onDown);
			el.removeEventListener('pointerup', onUp);
			el.removeEventListener('pointermove', onMove);
		};
	});

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
