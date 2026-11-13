/**
 * Simple geometric pictograms in a 100x100 box, the same shapes as the
 * explainer video's (`ant-video/src/parts/Picto.tsx`), painted on canvas.
 * They are the ANT pictograms.
 */
/**
 * The 20 interest tokens, in sticker-sheet order. Same shapes as the printed
 * stickers (`print/interest-tokens/tokens.mjs`), copied verbatim.
 */
export const TOKEN_IDS = [
	'sport', 'outdoors', 'gardening', 'animals', 'cooking',
	'music', 'art', 'crafts', 'repair', 'technology',
	'games', 'reading', 'film', 'science', 'history',
	'travel', 'health', 'faith', 'family', 'community'
] as const;
export type TokenId = (typeof TOKEN_IDS)[number];

export type PictoId = 'person' | 'person2' | 'leaf' | 'bike' | 'note' | 'pot' | 'sprout' | 'wave' | 'tri' | 'ring' | 'cross' | 'stairs' | TokenId;

type Part = { d?: string; c?: [number, number, number]; fill?: boolean; w?: number };

const TOKEN_PARTS: Record<TokenId, Part[]> = {
	sport: [{ d: 'M32 50h36M32 30v40M20 38v24M68 30v40M80 38v24' }],
	outdoors: [{ d: 'M12 80l26-44 14 22 10-14 26 36z' }, { c: [75, 24, 8] }],
	gardening: [{ d: 'M28 74C26 40 48 24 76 24c0 30-18 50-48 50z' }, { d: 'M28 74l30-30' }],
	animals: [
		{ c: [23, 47, 8], fill: true },
		{ c: [40, 28, 9], fill: true },
		{ c: [60, 28, 9], fill: true },
		{ c: [77, 47, 8], fill: true },
		{ d: 'M50 52c-13 0-24 12-24 22 0 8 7 11 13 9 4-1.5 7-2 11-2s7 .5 11 2c6 2 13-1 13-9 0-10-11-22-24-22z', fill: true }
	],
	cooking: [
		{ d: 'M22 46h56v16c0 12-10 20-22 20H44c-12 0-22-8-22-20z' },
		{ d: 'M14 46h72M40 34c0-6 6-6 6-12M56 34c0-6 6-6 6-12' }
	],
	music: [{ d: 'M40 70V26l32-6v42' }, { c: [31, 70, 9] }, { c: [63, 64, 9] }],
	art: [
		{ d: 'M50 18c-19 0-34 14-34 32s14 32 32 32c6 0 9-4 9-8 0-5-4-6-4-11 0-5 4-8 9-8h8c9 0 14-6 14-13 0-14-15-24-34-24z' },
		{ c: [33, 50, 5], fill: true },
		{ c: [42, 34, 5], fill: true },
		{ c: [61, 33, 5], fill: true }
	],
	crafts: [{ c: [30, 72, 10] }, { c: [70, 72, 10] }, { d: 'M36 64L68 18M64 64L32 18' }],
	repair: [{ d: 'M39 32L53 18L85 49L71 63z' }, { d: 'M20 82L55 47' }],
	technology: [{ d: 'M32 32h36v36H32z' }, { d: 'M42 18v14M58 18v14M42 68v14M58 68v14M18 42h14M18 58h14M68 42h14M68 58h14' }],
	games: [
		{ d: 'M30 20h40a10 10 0 0 1 10 10v40a10 10 0 0 1-10 10H30a10 10 0 0 1-10-10V30a10 10 0 0 1 10-10z' },
		{ c: [36, 36, 5], fill: true },
		{ c: [50, 50, 5], fill: true },
		{ c: [64, 64, 5], fill: true }
	],
	reading: [{ d: 'M50 30c-8-6-20-8-34-6v46c14-2 26 0 34 6 8-6 20-8 34-6V24c-14-2-26 0-34 6zM50 30v46' }],
	film: [{ d: 'M22 24h56v22c0 20-12 34-28 34S22 66 22 46z' }, { d: 'M34 42h10M56 42h10M38 58c6 7 18 7 24 0' }],
	science: [{ d: 'M38 18h24M44 18v22L24 76c-2 4 0 8 5 8h42c5 0 7-4 5-8L56 40V18' }, { d: 'M36 62h28' }],
	history: [{ d: 'M16 40L50 18l34 22z' }, { d: 'M30 40v42M50 40v42M70 40v42M14 82h72' }],
	travel: [{ c: [50, 50, 32] }, { d: 'M18 50h64M50 18c-16 16-16 48 0 64M50 18c16 16 16 48 0 64' }],
	health: [{ d: 'M40 18h20v22h22v20H60v22H40V60H18V40h22z' }],
	faith: [{ d: 'M50 16c8 10 10 14 10 19a10 10 0 0 1-20 0c0-5 2-9 10-19z' }, { d: 'M40 58h20v26H40z' }],
	family: [
		{ c: [34, 32, 12], fill: true },
		{ d: 'M12 84c1-18 9-28 22-28s21 10 22 28z', fill: true },
		{ c: [74, 51, 9], fill: true },
		{ d: 'M60 84c1-11 5-17 14-17s13 6 14 17z', fill: true }
	],
	community: [{ d: 'M50 80C30 64 16 52 16 38c0-11 8-18 17-18 7 0 13 4 17 11 4-7 10-11 17-11 9 0 17 7 17 18 0 14-14 26-34 42z' }]
};

const PARTS: Record<PictoId, Part[]> = {
	...TOKEN_PARTS,
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
