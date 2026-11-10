<script lang="ts">
	import BlobCanvas from '#lib/blobs/BlobCanvas.svelte';
	import { C, approach, wobble, type Blob, type Scene } from '#lib/blobs/types.js';
	import { networkNodes, story, type NodeId } from '#lib/content.js';
	import { positions } from './layout.js';

	/**
	 * The neighbourhood network for the "How it works" story.
	 * Nodes are blobs: white until the update reaches them, then green.
	 * Each connection is drawn as a chain of small blobs that grows from one
	 * node to the next, so the bridges the engine draws between them read as
	 * the update travelling. `step` is the story step in view.
	 */
	let { step }: { step: number } = $props();

	const ids = networkNodes.map((n) => n.id);
	const links = story.flatMap((s, i) => s.from.map((from) => ({ from, to: s.node, step: i })));

	/** Eased reveal state per node (0 = white/small, 1 = green) and per link (0..1 grown). */
	const nodeLit = Object.fromEntries(ids.map((id) => [id, 0])) as Record<NodeId, number>;
	const linkGrow = links.map(() => 0);

	const reachedAt = (id: NodeId) => story.findIndex((s) => s.node === id);

	const scene: Scene = ({ time, dt, w, h, reduced }) => {
		const pos = positions(w, h);
		const m = Math.min(w, h);
		const R = Math.max(16, m * 0.062);
		const drift = reduced ? 0 : m * 0.012;
		const snap = dt === 0 || reduced;
		let busy = false;

		const blobs: Blob[] = [];
		const live: Record<string, [number, number]> = {};
		ids.forEach((id, i) => {
			const target = reachedAt(id) <= step ? 1 : 0;
			nodeLit[id] = snap ? target : approach(nodeLit[id], target, 6, dt);
			if (Math.abs(nodeLit[id] - target) > 0.002) busy = true;
			const [wx, wy] = wobble(i + 1, time, 18, drift);
			const [x, y] = pos[id];
			live[id] = [x + wx, y + wy];
			const lit = nodeLit[id];
			const current = story[step]?.node === id ? 1 : 0;
			const r = R * (id === 'hub' ? 1.35 : 1) * (0.78 + 0.22 * lit + 0.12 * current);
			blobs.push({ id: i + 1, x: x + wx, y: y + wy, r, color: lit > 0.5 ? C.green : C.white });
		});

		// Chains: small blobs spaced along each link, grown up to its progress.
		const bead = Math.max(5, R * 0.26);
		const gap = bead * 2.5;
		links.forEach((l, li) => {
			const target = l.step <= step ? 1 : 0;
			// Grow forward, but retract quickly when scrolling back.
			linkGrow[li] = snap ? target : approach(linkGrow[li], target, target ? 2.6 : 8, dt);
			if (Math.abs(linkGrow[li] - target) > 0.002) busy = true;
			const g = linkGrow[li];
			if (g < 0.01) return;
			const [x0, y0] = live[l.from];
			const [x1, y1] = live[l.to];
			const len = Math.hypot(x1 - x0, y1 - y0);
			const n = Math.max(2, Math.floor(len / gap));
			for (let k = 1; k < n; k++) {
				const t = k / n;
				if (t > g) break;
				// Beads swell as the front passes, then settle.
				const front = Math.max(0, 1 - Math.abs(g - t) * n * 0.35);
				const nx = -(y1 - y0) / len;
				const ny = (x1 - x0) / len;
				const bend = Math.sin(t * Math.PI) * len * 0.06 * (li % 2 ? 1 : -1);
				blobs.push({
					id: 100 + li * 40 + k,
					x: x0 + (x1 - x0) * t + nx * bend,
					y: y0 + (y1 - y0) * t + ny * bend,
					r: bead * (1 + front * 0.5),
					color: C.green
				});
			}
		});
		return { blobs, busy };
	};
</script>

<BlobCanvas
	{scene}
	playing
	version={step}
	params={{ reach: 1.9, thickness: 0.42, flare: 0.4, smooth: 0.55, snap: 0.9, taper: 2.6, organic: 0.6, maxBridges: 4, noOverlap: false }}
/>
