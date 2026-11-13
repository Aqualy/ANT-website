import type { KitItemId } from '#lib/content.js';
import { SIZE } from '#lib/prints/real.js';

/** Scene units per millimetre: the 240 mm box is 3.2 units wide (1 unit = 75 mm). Everything is to scale. */
export const U = 3.2 / SIZE.kit.w;

/** The real kit box: 240 x 220 x 55 mm, a mailer box with a hinged lid and a tuck flap. */
export const BW = SIZE.kit.w * U;
export const BD = SIZE.kit.d * U;
export const BH = SIZE.kit.h * U;
export const WALL = 0.03;
/** Inside floor, where the packed items rest. */
export const FLOOR = WALL;
export const LID_OPEN_ANGLE = -1.92;

/** Item sizes in scene units. */
export const ITEM = {
	page: { w: SIZE.page.w * U, d: SIZE.page.h * U },
	sheet: { w: SIZE.sheet.w * U, d: SIZE.sheet.h * U },
	template: { w: SIZE.template.w * U, d: SIZE.template.h * U },
	map: { w: SIZE.map.w * U, d: SIZE.map.h * U },
	cardBox: { w: SIZE.cardBox.w * U, d: SIZE.cardBox.h * U, h: SIZE.cardBox.d * U },
	card: { w: SIZE.card.w * U, d: SIZE.card.h * U }
} as const;

/**
 * Packed in the closed box: x, y (above the floor), z, rotation-y, scale.
 * The A3 map travels folded in quarters, so it's packed at half size and
 * unfolds as it comes out.
 */
export const packed: Record<KitItemId, [number, number, number, number, number?]> = {
	map: [-0.5, FLOOR, 0, 0, 0.5],
	profiles: [0.6, FLOOR + 0.03, 0, 0.02],
	tokens: [0, FLOOR + 0.07, 0.05, -0.01],
	symbols: [-0.75, FLOOR + 0.085, -0.3, 0.03],
	cards: [0.45, FLOOR + 0.12, 0.45, 0]
};

/** Laid out on the table once the kit is open: x, z, rotation-y. */
export const laid: Record<KitItemId, [number, number, number]> = {
	map: [-4.15, 1.45, 0.03],
	profiles: [-0.75, 3.4, -0.03],
	tokens: [1.85, 3.3, 0.04],
	symbols: [4.15, 3.1, -0.05],
	cards: [2.8, 0.05, -0.06]
};

/** The longest side of each item, so the inspect view can show each one at the same size. */
export const span: Record<KitItemId, number> = {
	map: ITEM.map.d,
	profiles: ITEM.page.d,
	tokens: ITEM.sheet.d,
	symbols: ITEM.template.d,
	cards: 2.0
};

/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
	current + (target - current) * (1 - Math.exp(-lambda * dt));

export type FocusPose = { position: [number, number, number]; tiltX: number; scale: number };
