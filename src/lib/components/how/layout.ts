import type { NodeId } from '#lib/content.js';

/** Node positions as fractions of the story canvas, for landscape and portrait canvases. */
const WIDE: Record<NodeId, [number, number]> = {
	you: [0.14, 0.22],
	blob: [0.42, 0.46],
	booklet: [0.78, 0.16],
	private: [0.84, 0.48],
	board: [0.14, 0.66],
	marks: [0.46, 0.86],
	far: [0.78, 0.82]
};
const TALL: Record<NodeId, [number, number]> = {
	you: [0.2, 0.17],
	blob: [0.46, 0.44],
	booklet: [0.8, 0.17],
	private: [0.82, 0.5],
	board: [0.16, 0.65],
	marks: [0.5, 0.86],
	far: [0.78, 0.83]
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

/**
 * Where each label sits, on the side no connection leaves from (and inside the canvas).
 * Both layouts share it: the local Blob is the centre of a star, with its left side free.
 */
const SIDES: Record<NodeId, Side> = {
	you: 'above',
	blob: 'left',
	booklet: 'above',
	private: 'below',
	board: 'below',
	marks: 'below',
	far: 'below'
};

export const labelSideFor = (): Record<NodeId, Side> => SIDES;
