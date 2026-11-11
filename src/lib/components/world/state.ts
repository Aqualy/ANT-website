/**
 * Everything that can move in the world, as plain numbers. A host (the
 * explainer's chapters, later a playable version) sets these and calls
 * `world.apply(state)`. Values are 0..1 unless noted.
 */
export type WorldState = {
	/** House islands grow and bridge into a network. */
	network: number;
	/** Ground blobs under the other Blobs. */
	far: number;
	/** Ground blob under the local Blob, with its two operators. */
	blobSpot: number;
	/** Green spreads over the ground; blobs it reaches turn black. */
	green: number;

	/** Blackout Communication Kit box appears. */
	kit: number;
	kitOpen: number;
	/** The six item cards rise out of the box and fan out. */
	kitFan: number;

	/** Noor's paper profile and the sticker sheet appear. */
	profile: number;
	pPhoto: number;
	pName: number;
	pStory: number;
	/** 0..3: how many interest tokens have flown from the sheet to the profile. */
	pTokens: number;
	pWritten: number;

	/** Noor: 0 at home, 1 at the local Blob. */
	walkNoor: number;
	/** Noor carries the profile. */
	carry: number;
	/** The carried profile goes over the counter. */
	handIn: number;

	/** Booklet leaf: 0 closed on the right, 1 turned to the left. */
	flip: number;
	/** Blob chain between the two matching interest tokens. */
	match: number;

	/** Sam: 0 at home, 1 at the local Blob. */
	sam: number;
	/** Noor's profile on display at the Blob. */
	priv: number;
	/** 1 = everything but name and picture is covered. */
	cover: number;
	slipOn: number;
	/** 0..2: request slip at Sam (0), held at the Blob (1), with Noor (2). */
	slip: number;

	form: number;
	formDraw: number;
	/** The form shrinks into the board's empty cell. */
	toBoard: number;
	/** The new symbol is on the public board. */
	symbol: number;
	pins: number;

	/** Blob chains from the local Blob to the others. */
	chains: number;
	/** Profile copies travel along them. */
	copies: number;
	/** Fibre-optic cables are drawn. */
	fibre: number;
	/** Unbounded: phase of the light pulses along the cables. */
	pulse: number;
};

export const WORLD_KEYS = [
	'network', 'far', 'blobSpot', 'green',
	'kit', 'kitOpen', 'kitFan',
	'profile', 'pPhoto', 'pName', 'pStory', 'pTokens', 'pWritten',
	'walkNoor', 'carry', 'handIn',
	'flip', 'match',
	'sam', 'priv', 'cover', 'slipOn', 'slip',
	'form', 'formDraw', 'toBoard', 'symbol', 'pins',
	'chains', 'copies', 'fibre', 'pulse'
] as const satisfies readonly (keyof WorldState)[];

export function restState(): WorldState {
	const s = {} as WorldState;
	for (const k of WORLD_KEYS) s[k] = 0;
	return s;
}
