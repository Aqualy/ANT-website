/** A blob placed by a scene, in CSS pixels of its canvas. */
export type Blob = { id: number; x: number; y: number; r: number; color: string };

export type SceneInput = {
	/** Seconds of animation so far (stays 0 with reduced motion). */
	time: number;
	/** Seconds since the previous frame (0 on the first frame). */
	dt: number;
	/** Canvas size in CSS pixels. */
	w: number;
	h: number;
	/** Reduced motion: snap transitions instead of easing them. */
	reduced: boolean;
};

/** `busy` keeps frames coming while a transition settles, even when not playing. */
export type Scene = (input: SceneInput) => { blobs: Blob[]; busy?: boolean };

/** The ANT palette as used inside blob scenes. */
export const C = {
	black: '#000000',
	grey: '#dddddd',
	white: '#ffffff',
	green: '#c5d92f'
} as const;

/** Frame-rate independent easing toward a target. */
export const approach = (current: number, target: number, rate: number, dt: number) =>
	current + (target - current) * (1 - Math.exp(-rate * dt));

/** Two-harmonic periodic wobble, a lighter cousin of the engine's drift motion. */
export function wobble(id: number, time: number, period: number, amp: number): [number, number] {
	const a = (time / period) * Math.PI * 2;
	const s = id * 1.618;
	return [
		amp * (0.65 * Math.sin(a + s) + 0.35 * Math.sin(2 * a + s * 2.3)),
		amp * (0.65 * Math.cos(a + s * 1.7) + 0.35 * Math.sin(3 * a + s)) * 0.85
	];
}
