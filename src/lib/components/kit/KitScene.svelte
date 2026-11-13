<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { OrbitControls, interactivity } from '@threlte/extras';
	import { onDestroy, untrack } from 'svelte';
	import { Vector3, type PerspectiveCamera } from 'three';
	import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
	import { kitItems, type KitItemId } from '#lib/content.js';
	import type { KitState } from './kitState.svelte';
	import type { KitTextures } from './textures';
	import { createMaterials, disposeMaterials } from './materials';
	import KitBox from './KitBox.svelte';
	import KitObject from './KitObject.svelte';
	import KitItemModel from './KitItemModel.svelte';
	import { damp, type FocusPose } from './dims';

	let { kit, textures }: { kit: KitState; textures: KitTextures } = $props();

	interactivity({ clickDistanceThreshold: 6 });

	const { invalidate, size } = useThrelte();
	const m = untrack(() => createMaterials(textures));
	onDestroy(() => disposeMaterials(m));

	/* ---------- camera poses ---------- */
	type Pose = { target: [number, number, number]; offset: [number, number, number] };
	const FOCUS_TARGET: [number, number, number] = [0, 2.0, 1.0];
	const FOCUS_OFFSET: [number, number, number] = [0, 0.95, 2.75];
	const poses: Record<'closed' | 'open' | 'inspect', Pose> = {
		closed: { target: [0, 0.4, 0.1], offset: [4.0, 3.3, 5.0] },
		open: { target: [-0.65, 0, 1.7], offset: [0, 11.2, 6.4] },
		inspect: { target: FOCUS_TARGET, offset: FOCUS_OFFSET }
	};

	const focus: FocusPose = {
		position: FOCUS_TARGET,
		tiltX: Math.atan2(FOCUS_OFFSET[2], FOCUS_OFFSET[1]),
		/** Length of an item's longest side when inspected. */
		scale: 1.35
	};

	// Pull the camera back on narrow/portrait canvases so the kit still fits.
	const distanceFactor = $derived.by(() => {
		const { width, height } = $size;
		const aspect = width / Math.max(1, height);
		const wide = kit.view === 'open' ? 1.45 : 1.2;
		return Math.max(1, Math.min(2.4, wide / Math.max(aspect, 0.4)));
	});

	let camera = $state<PerspectiveCamera>();
	let controls = $state<OrbitControlsImpl>();
	let tweening = $state(false);

	const goalPos = new Vector3();
	const goalTarget = new Vector3();

	function setGoal() {
		const p = poses[kit.view];
		goalTarget.set(...p.target);
		goalPos.set(p.offset[0], p.offset[1], p.offset[2]).multiplyScalar(distanceFactor).add(goalTarget);
	}

	function snap() {
		if (!camera || !controls) return;
		camera.position.copy(goalPos);
		controls.target.copy(goalTarget);
		controls.update();
		invalidate();
	}

	let placed = false;
	$effect(() => {
		void kit.view;
		void distanceFactor;
		if (!camera || !controls) return;
		setGoal();
		if (!placed || kit.reducedMotion) {
			placed = true;
			snap();
			return;
		}
		controls.enabled = false;
		tweening = true;
	});

	useTask(
		(dt) => {
			if (!camera || !controls) return;
			const d = Math.min(dt, 0.05);
			const k = 4.5;
			camera.position.set(
				damp(camera.position.x, goalPos.x, k, d),
				damp(camera.position.y, goalPos.y, k, d),
				damp(camera.position.z, goalPos.z, k, d)
			);
			controls.target.set(
				damp(controls.target.x, goalTarget.x, k, d),
				damp(controls.target.y, goalTarget.y, k, d),
				damp(controls.target.z, goalTarget.z, k, d)
			);
			controls.update();
			if (camera.position.distanceTo(goalPos) < 0.004 && controls.target.distanceTo(goalTarget) < 0.004) {
				snap();
				controls.enabled = true;
				tweening = false;
			}
			invalidate();
		},
		{ autoInvalidate: false, running: () => tweening }
	);

	function select(id: KitItemId) {
		kit.inspect(id);
	}
</script>

<T.PerspectiveCamera makeDefault fov={35} near={0.1} far={60} position={[6, 5, 7]} bind:ref={camera}>
	<OrbitControls
		bind:ref={controls}
		enablePan={false}
		enableDamping
		dampingFactor={0.12}
		rotateSpeed={0.7}
		zoomSpeed={0.7}
		minDistance={2.2}
		maxDistance={24}
		minPolarAngle={0.12}
		maxPolarAngle={1.42}
	/>
</T.PerspectiveCamera>

<!-- Soft studio lighting -->
<T.HemisphereLight args={['#ffffff', '#dddddd', 1.4]} />
<T.DirectionalLight
	position={[3.5, 7, 4.5]}
	intensity={2.4}
	castShadow
	shadow.mapSize={[2048, 2048]}
	shadow.camera.left={-8}
	shadow.camera.right={8}
	shadow.camera.top={6}
	shadow.camera.bottom={-6}
	shadow.camera.near={2}
	shadow.camera.far={20}
	shadow.bias={-0.0008}
	shadow.normalBias={0.035}
	shadow.radius={2}
/>
<T.DirectionalLight position={[-5, 3, -2]} intensity={0.6} />

<!-- Contact surface -->
<T.Mesh rotation.x={-Math.PI / 2} receiveShadow>
	<T.PlaneGeometry args={[40, 40]} />
	<T.ShadowMaterial opacity={0.16} />
</T.Mesh>

<KitBox
	{m}
	open={kit.isOpen}
	instant={kit.reducedMotion}
	onboxclick={kit.view === 'closed' ? () => kit.open() : undefined}
/>

{#each kitItems as item, i (item.id)}
	<KitObject
		id={item.id}
		index={i}
		out={kit.isOpen}
		focused={kit.view === 'inspect' && kit.selected === item.id}
		interactive={kit.isOpen}
		instant={kit.reducedMotion}
		{focus}
		onselect={select}
	>
		<KitItemModel id={item.id} {m} />
	</KitObject>
{/each}
