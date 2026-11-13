/**
 * Where everything stands. x runs east, z runs south (toward the usual
 * camera), y is up. One unit is roughly a metre, but props are oversized on
 * purpose so they read from the camera: this is a diorama, not a survey.
 */
export type XZ = readonly [x: number, z: number];

export const P = { black: '#000000', grey: '#dddddd', white: '#ffffff', green: '#c5d92f' } as const;

/** Ground area covered by the blob texture. */
export const GROUND = { x0: -24, z0: -19, w: 48, h: 36, ppu: 40 } as const;

/** Streets: centre line from a to b, and width. They stop at the edge of the model, which stands on an empty table. */
export const STREETS: { a: XZ; b: XZ; w: number }[] = [
	{ a: [-22.5, 5], b: [22.5, 5], w: 1.6 },
	{ a: [-22.5, -8.6], b: [22.5, -8.6], w: 1.4 },
	{ a: [-9.6, -18.5], b: [-9.6, 19.5], w: 1.4 },
	{ a: [9.6, -18.5], b: [9.6, 19.5], w: 1.4 }
];

export const LOCAL_BLOB: XZ = [0, -1.5];
export const OTHER_BLOBS: { at: XZ; bend: number }[] = [
	{ at: [-16.5, -13.5], bend: 1 },
	{ at: [16.5, -13.5], bend: -1 },
	{ at: [16, 11.5], bend: 1 }
];

export const NOOR_HOUSE: XZ = [-7, 8.4];
export const SAM_HOUSE: XZ = [6.6, 12.8];
/** Houses: position, quarter turns, size factor. The first two are Noor's and Sam's. */
export const HOUSES: { at: XZ; turn: number; s: number }[] = [
	{ at: NOOR_HOUSE, turn: 0, s: 1 },
	{ at: SAM_HOUSE, turn: 0, s: 1 },
	{ at: [-7, -3.5], turn: 0, s: 0.9 },
	{ at: [7, -3.5], turn: 0, s: 0.95 },
	{ at: [-14.2, -3.2], turn: 1, s: 1 },
	{ at: [-14.6, 9.2], turn: 0, s: 0.9 },
	{ at: [14.2, -2.6], turn: 1, s: 0.95 },
	{ at: [14.6, 16.4], turn: 1, s: 0.9 },
	{ at: [-3.8, -13.2], turn: 0, s: 1 },
	{ at: [4.2, -13.4], turn: 0, s: 0.9 },
	{ at: [-14, 15.6], turn: 1, s: 0.85 }
];

/** Extra network blobs between the islands, so the bridges can reach. */
export const LINKS: { at: XZ; r: number }[] = [
	{ at: [-3.9, 4.2], r: 1.25 },
	{ at: [3.9, 4.2], r: 1.25 },
	{ at: [-9.8, 1.2], r: 1.2 },
	{ at: [9.8, 1.4], r: 1.2 },
	{ at: [0, -8.4], r: 1.25 },
	{ at: [-10.4, -9.2], r: 1.15 },
	{ at: [10.6, -9], r: 1.15 },
	{ at: [13.6, 5.2], r: 1.1 },
	{ at: [-10.2, 13], r: 1 },
	{ at: [-13.4, -10.8], r: 1 },
	{ at: [13.4, -10.8], r: 1 },
	{ at: [11.6, 10.4], r: 1.1 },
	{ at: [5, 8.6], r: 1.1 }
];

export const OPERATORS: XZ[] = [
	[-2.25, -0.1],
	[2.25, -0.1]
];

export const NOOR_HOME: XZ = [-5.9, 11.4];
export const NOOR_AT_BLOB: XZ = [1.25, 1.9];
export const SAM_HOME: XZ = [4.3, 14.4];
export const SAM_AT_BLOB: XZ = [-3.5, 2.5];

/** West of Noor and her house, so they stand to the right of the kit and the caption's side stays empty. */
export const KIT_AT: XZ = [-10.6, 11.6];
/** Centre of the profile "desk" (sticker sheet and pages) above the kit. */
export const DESK_AT = [-10.8, 2.55, 11.6] as const;

export const BOOKLET_AT: XZ = [-7, 0.5];
export const BOARD_AT: XZ = [7, -0.3];
/** Where Noor's profile hangs at the Blob in the private chapter. */
export const PRIV_CARD_AT = [3.5, 3.05, 0.9] as const;
/** Counter of the kiosk: where things are handed over. */
export const COUNTER_AT = [0, 1.45, -0.35] as const;

export const PINS: XZ[] = [
	[9.6, -8.6],
	[9.6, 1.2]
];
