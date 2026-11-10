import { resolveBlob } from './engine.js';
import { ORIGINAL_SCENE as S } from './original.js';
import type { Scene } from './types.js';

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Board position (0..1, blobs drift to about -0.25..1.25) to area position.
 * Linear through the middle, easing at the edges, so blob centres stay
 * inside the area while the motion keeps its shape.
 */
const K = 2;
const squash = (u: number) => 0.5 + (0.5 * Math.tanh(K * (u - 0.5))) / Math.tanh(0.75 * K);

/**
 * The supplied scene as a native Scene: the same blobs, sizes, colours, drift
 * motion and 30 s loop, laid out inside `area` (CSS pixels) so it can sit
 * beside or above text instead of under it. Blob centres are kept one
 * largest-radius inside the area, so no blob ever crosses its edge.
 */
export function originalScene(area: (w: number, h: number) => Rect): Scene {
	const resolved = S.blobs.map((b) => ({ id: b.id, x: 0, y: 0, r: 0 }));
	const maxR = Math.max(...S.blobs.map((b) => b.r * (1 + b.motion.pulse)));
	return ({ time, w, h }) => {
		const a = area(w, h);
		// Size from the area, keeping roughly the original's density (12 blobs across a 1920 board).
		const s = Math.min(a.h / (maxR * 4.2), a.w / (S.board.w * 0.9));
		const m = maxR * s;
		const t = time % S.loop;
		const blobs = S.blobs.map((b, i) => {
			const o = resolveBlob(b, t, S.loop, resolved[i]);
			return {
				id: o.id,
				x: a.x + m + squash(o.x / S.board.w) * (a.w - 2 * m),
				y: a.y + m + squash(o.y / S.board.h) * (a.h - 2 * m),
				r: o.r * s,
				color: b.color
			};
		});
		return { blobs };
	};
}
