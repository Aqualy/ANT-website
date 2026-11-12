/**
 * Simple geometric pictograms in a 100x100 box, the same shapes as the
 * explainer video's (`ant-video/src/parts/Picto.tsx`), painted on canvas.
 * They are the ANT pictograms.
 */
export type PictoId = 'person' | 'person2' | 'leaf' | 'bike' | 'note' | 'pot' | 'sprout' | 'wave' | 'tri' | 'ring' | 'cross' | 'stairs';

type Part = { d?: string; c?: [number, number, number]; fill?: boolean; w?: number };

const PARTS: Record<PictoId, Part[]> = {
	person: [{ c: [50, 38, 17], fill: true }, { d: 'M18 92c2-20 15-30 32-30s30 10 32 30z', fill: true }],
	person2: [
		{ c: [50, 36, 15], fill: true },
		{ d: 'M22 92c0-18 12-28 28-28s28 10 28 28z', fill: true },
		{ d: 'M32 30c4-14 32-14 36 0', w: 9 }
	],
	leaf: [{ d: 'M28 74C26 40 48 24 76 24c0 30-18 50-48 50z' }, { d: 'M28 74l30-30' }],
	bike: [{ c: [27, 64, 15] }, { c: [73, 64, 15] }, { d: 'M27 64l16-26h22l8 26M43 38l12 26 10-26M38 30h12' }],
	note: [{ d: 'M40 70V26l32-6v42' }, { c: [31, 70, 9] }, { c: [63, 64, 9] }],
	pot: [
		{ d: 'M22 46h56v16c0 12-10 20-22 20H44c-12 0-22-8-22-20z' },
		{ d: 'M14 46h72M40 34c0-6 6-6 6-12M56 34c0-6 6-6 6-12' }
	],
	sprout: [
		{ d: 'M50 86V46' },
		{ d: 'M50 56C50 38 36 30 22 30c0 16 12 26 28 26z' },
		{ d: 'M50 48c0-14 12-22 26-22 0 14-10 22-26 22z' },
		{ d: 'M28 86h44' }
	],
	wave: [{ d: 'M14 44c12-12 24 12 36 0s24 12 36 0M14 64c12-12 24 12 36 0s24 12 36 0' }],
	tri: [{ d: 'M50 18l34 60H16z' }],
	ring: [{ c: [50, 50, 30] }, { c: [50, 50, 7], fill: true }],
	cross: [{ d: 'M50 18v64M18 50h64' }],
	stairs: [{ d: 'M16 80h20V62h20V44h20V26h10' }]
};

const cache = new Map<string, Path2D>();
const path = (d: string) => {
	let p = cache.get(d);
	if (!p) cache.set(d, (p = new Path2D(d)));
	return p;
};

/**
 * Paints a pictogram with its top-left at (x, y). `draw` (0..1) reveals the
 * strokes, for hand-drawn moments.
 */
export function drawPicto(ctx: CanvasRenderingContext2D, id: PictoId, x: number, y: number, size: number, draw = 1, color = '#000000') {
	if (draw <= 0) return;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(size / 100, size / 100);
	ctx.fillStyle = color;
	ctx.strokeStyle = color;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	// Longest stroke is about 190 units; a dash of that length times `draw` reveals it.
	ctx.setLineDash(draw < 1 ? [200 * draw, 1000] : []);
	for (const p of PARTS[id]) {
		ctx.lineWidth = p.w ?? 7;
		if (p.c) {
			ctx.beginPath();
			ctx.arc(p.c[0], p.c[1], p.c[2], 0, Math.PI * 2);
			if (p.fill) ctx.fill();
			else ctx.stroke();
		} else if (p.d) {
			if (p.fill) ctx.fill(path(p.d));
			else ctx.stroke(path(p.d));
		}
	}
	ctx.restore();
}
