/** Types for the verbatim blob engine in engine.js. */

export type BlobParams = {
	reach: number;
	thickness: number;
	flare: number;
	smooth: number;
	snap: number;
	taper: number;
	organic: number;
	maxBridges: number;
	noOverlap: boolean;
};

/** A blob as the field sees it: position and radius in board units. */
export type FieldBlob = { id: number; x: number; y: number; r: number };
export type RenderBlob = FieldBlob & { rgb: [number, number, number] };

export type Motion = {
	type: 'drift' | 'orbit' | 'swing' | 'none';
	amp: number;
	cycles: number;
	phase: number;
	angle: number;
	pulse: number;
};
export type SceneBlob = { id: number; x: number; y: number; r: number; color: string; motion: Motion };

export type Pair = Record<string, number>;

export type Frame = {
	blobs: RenderBlob[];
	pairs: Pair[];
	params: BlobParams;
	view: { scale: number; ox: number; oy: number };
	board: { w: number; h: number };
	background: string;
	transparent?: boolean;
	clip?: boolean;
	stage?: string;
};

export const DEFAULT_PARAMS: Readonly<BlobParams>;
export const LIMITS: Readonly<{ maxBlobs: number; maxPairs: number }>;
export function computePairs(blobs: FieldBlob[], p: BlobParams): Pair[];
export function resolveBlob(b: SceneBlob, time: number, loop: number, out: FieldBlob): FieldBlob;
export function hexToRgb(hex: string): [number, number, number];

export class Renderer {
	constructor(canvas: HTMLCanvasElement, opts?: { preserve?: boolean; skipUnchanged?: boolean });
	gl: WebGL2RenderingContext;
	lost: boolean;
	render(frame: Frame): boolean;
	invalidate(): void;
}
