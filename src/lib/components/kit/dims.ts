import type { KitItemId } from '#lib/content.js';

/** Box proportions in scene units (roughly 1 unit = 10 cm): a 32 x 22 x 8 cm kit box. */
export const BW = 3.2;
export const BD = 2.2;
export const BH = 0.8;
export const WALL = 0.05;
export const INSERT_H = 0.3;
/** Top of the grey insert, where items rest. */
export const FLOOR = WALL + INSERT_H;

/** Telescoping lid. */
export const LID_GAP = 0.012;
export const LW = BW + 2 * (WALL + LID_GAP);
export const LD = BD + 2 * (WALL + LID_GAP);
export const LH = 0.32;
export const LID_TOP_Y = BH + LID_GAP + WALL;
export const LID_OPEN_ANGLE = -1.92;

const CX = (BW - 2 * WALL) / 3;
const CZ = (BD - 2 * WALL) / 4;

/** Resting place (x, z, rotation-y) for each item in its compartment. */
export const homes: Record<KitItemId, [number, number, number]> = {
	language: [-CX, -CZ, 0.03],
	map: [0, -CZ, -0.02],
	signage: [CX, -CZ, 0],
	cards: [-CX, CZ, -0.06],
	profiles: [0, CZ, 0.04],
	tokens: [CX, CZ, 0]
};

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
	current + (target - current) * (1 - Math.exp(-lambda * dt));

export type FocusPose = { position: [number, number, number]; tiltX: number; scale: number };
