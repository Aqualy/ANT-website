import type { NodeId } from '#lib/content.js';

/** Node positions as fractions of the story canvas, for landscape and portrait canvases. */
const WIDE: Record<NodeId, [number, number]> = {
	residents: [0.16, 0.18],
	hub: [0.42, 0.42],
	printed: [0.8, 0.16],
	neighbours: [0.82, 0.6],
	wayfinding: [0.18, 0.7],
	meeting: [0.52, 0.86]
};
const TALL: Record<NodeId, [number, number]> = {
	residents: [0.2, 0.2],
	hub: [0.42, 0.44],
	printed: [0.8, 0.2],
	neighbours: [0.8, 0.56],
	wayfinding: [0.2, 0.72],
	meeting: [0.54, 0.86]
};

export const layoutFor = (w: number, h: number) => (w / Math.max(h, 1) >= 0.95 ? WIDE : TALL);

/** Node centres in CSS pixels. Shared by the blob scene and the HTML labels. */
export function positions(w: number, h: number) {
	const map = layoutFor(w, h);
	return Object.fromEntries(Object.entries(map).map(([id, [fx, fy]]) => [id, [fx * w, fy * h]])) as Record<
		NodeId,
		[number, number]
	>;
}

type Side = 'above' | 'below' | 'left' | 'right';

/** Where each label sits, on the side no connection leaves from (and inside the canvas). */
export const labelSideFor = (w: number, h: number): Record<NodeId, Side> => (layoutFor(w, h) === WIDE ? SIDES_WIDE : SIDES_TALL);

const SIDES_TALL: Record<NodeId, Side> = {
	residents: 'above',
	hub: 'right',
	printed: 'above',
	neighbours: 'left',
	wayfinding: 'right',
	meeting: 'below'
};

const SIDES_WIDE: Record<NodeId, Side> = {
	residents: 'above',
	hub: 'right',
	printed: 'above',
	neighbours: 'right',
	wayfinding: 'left',
	meeting: 'below'
};
