/**
 * The nine chapters of /explore, in one typed array: copy, camera, labels and
 * the world state each one wants. The world itself knows none of this.
 */
import { brand, story } from '#lib/content.js';
import type { WorldState } from '#lib/components/world/state.js';
import type { AnchorId } from '#lib/components/world/world.js';

/** What the visitor has toggled inside a chapter. */
export type Ui = { choice: 'public' | 'private'; pageTurned: boolean };

/**
 * A camera pose described by what it must show: look at `target` from a
 * compass angle (`az`, 0 = from the south) and elevation (`el`), far enough
 * that a subject `w` wide and `h` tall fits whatever the aspect ratio.
 */
export type Shot = { target: [number, number, number]; az: number; el: number; w: number; h: number };

export type Label = {
	id: string;
	text: string;
	/** A named point in the world, or `stage` for a chip pinned to the bottom of the view. */
	anchor: AnchorId | 'stage';
	kind?: 'plain' | 'caption' | 'chip';
	/** Chip filled green (the active one). */
	on?: boolean | ((t: number, ui: Ui) => boolean);
	place?: 'above' | 'below';
	/** Visible from/to this many seconds into the chapter. */
	from?: number;
	to?: number;
	when?: (ui: Ui) => boolean;
	/** Makes the chip a button. */
	action?: 'public' | 'private' | 'turn';
};

export type Chapter = {
	id: string;
	/** Small line above the title. */
	eyebrow: string;
	/** 1..6 for the six steps of the system, as in the video. */
	step?: number;
	title: string;
	text: string;
	note?: string;
	logo?: boolean;
	links?: { label: string; href: string; primary?: boolean }[];
	/** Seconds until the choreography has played out. */
	duration: number;
	shot: (t: number, portrait: boolean) => Shot;
	/** World state wanted `t` seconds in (Infinity = settled). Unlisted channels are 0. */
	targets: (t: number, ui: Ui) => Partial<WorldState>;
	labels: Label[];
};

const after = (t: number, at: number) => (t >= at ? 1 : 0);
const between = (t: number, a: number, b: number) => (t >= a && t < b ? 1 : 0);
const still = (shot: Shot, portrait?: Partial<Shot>) => (_t: number, p: boolean) => (p && portrait ? { ...shot, ...portrait } : shot);

const s = story;

export const chapters: Chapter[] = [
	{
		id: 'intro',
		eyebrow: '2026–2035 · Preparing for a possible blackout',
		title: brand.fullName,
		text: 'ANT connects neighbours through local Blobs: paper profiles to get to know each other, shared symbols to mark the neighbourhood and, when there is power, light between Blobs.',
		logo: true,
		duration: 1.6,
		shot: still({ target: [0, 0, 0.5], az: 24, el: 36, w: 37, h: 25 }, { w: 32 }),
		targets: () => ({ network: 1, far: 1 }),
		labels: [{ id: 'blob', text: 'Local Blob', anchor: 'localBlob', kind: 'caption' }]
	},
	{
		id: 'kit',
		eyebrow: 'Start here',
		title: `The ${brand.kitName}`,
		text: 'One box of printed tools that helps you prepare for a blackout and build your community, starting now.',
		note: 'Concept model: the box and prints are design proposals.',
		duration: 2.4,
		shot: still({ target: [-2.7, 1.1, 11.4], az: 0, el: 44, w: 7.6, h: 6 }),
		targets: (t) => ({ kit: 1, kitOpen: after(t, 0.5), kitFan: after(t, 0.9) }),
		labels: [{ id: 'noor', text: 'Noor', anchor: 'noor', place: 'below' }]
	},
	{
		id: 'profile',
		eyebrow: 'Step 01',
		step: 1,
		title: s[0].title,
		text: s[0].text,
		duration: 5.6,
		shot: still({ target: [-3, 1.5, 11.4], az: 0, el: 44, w: 7.4, h: 6.2 }),
		targets: (t) => ({
			kit: 1,
			kitOpen: 1,
			profile: 1,
			pPhoto: after(t, 0.5),
			pName: after(t, 1.0),
			pStory: after(t, 1.5),
			pTokens: t < 2.5 ? 0 : Math.min(3, 1 + Math.floor((t - 2.5) / 0.55)),
			pWritten: after(t, 4.4)
		}),
		labels: [{ id: 'noor', text: 'Noor', anchor: 'noor', place: 'below' }]
	},
	{
		id: 'blob',
		eyebrow: 'Step 02',
		step: 2,
		title: s[1].title,
		text: s[1].text,
		duration: 4.2,
		shot: still({ target: [0, 1.75, 0.4], az: 0, el: 20, w: 9.6, h: 6.6 }),
		targets: (t) => ({ blobSpot: 1, walkNoor: 1, carry: 1, handIn: after(t, 2.5) }),
		labels: [
			{ id: 'op1', text: 'Operator', anchor: 'op1' },
			{ id: 'op2', text: 'Operator', anchor: 'op2' },
			{ id: 'noor', text: 'Noor', anchor: 'noor', place: 'below' },
			{ id: 'public', text: 'Public', anchor: 'stage', kind: 'chip', from: 3.2, action: 'public', on: (_t, ui) => ui.choice === 'public' },
			{ id: 'private', text: 'Private', anchor: 'stage', kind: 'chip', from: 3.2, action: 'private', on: (_t, ui) => ui.choice === 'private' }
		]
	},
	{
		id: 'public',
		eyebrow: 'Step 03',
		step: 3,
		title: s[2].title,
		text: s[2].text,
		duration: 3.4,
		shot: still({ target: [-7, 2.0, 0.6], az: 0, el: 30, w: 4.5, h: 3.9 }),
		targets: (t, ui) => ({ blobSpot: 1, flip: ui.pageTurned ? after(t, 0.8) : 0, match: ui.pageTurned ? after(t, 2.0) : 0 }),
		labels: [
			{ id: 'booklet', text: 'Blob booklet · public profiles', anchor: 'booklet', kind: 'caption' },
			{ id: 'match', text: 'Shared interest: gardening', anchor: 'stage', kind: 'chip', on: true, from: 2.6, when: (ui) => ui.pageTurned },
			{ id: 'turn', text: 'Turn the page', anchor: 'stage', kind: 'chip', from: 2.6, action: 'turn' }
		]
	},
	{
		id: 'private',
		eyebrow: 'Step 04',
		step: 4,
		title: s[3].title,
		text: s[3].text,
		duration: 7,
		shot: still({ target: [0.3, 1.95, 0.6], az: 0, el: 18, w: 11, h: 6.8 }, { w: 12 }),
		targets: (t) => ({
			blobSpot: 1,
			sam: 1,
			priv: 1,
			cover: t >= 6 ? 0 : 1,
			slipOn: between(t, 1.2, 5.6),
			slip: t >= 4.6 ? 2 : after(t, 1.5),
			walkNoor: after(t, 3.2)
		}),
		labels: [
			{ id: 'sam', text: 'Sam, a neighbour', anchor: 'sam', place: 'below' },
			{ id: 'noor', text: 'Noor', anchor: 'noor', place: 'below' },
			{ id: 'held', text: 'Held until Noor’s next visit', anchor: 'counter', place: 'below', from: 2.4, to: 4.6 },
			{ id: 'accept', text: 'Noor accepts', anchor: 'stage', kind: 'chip', on: true, from: 5.4 }
		]
	},
	{
		id: 'symbols',
		eyebrow: 'Step 05',
		step: 5,
		title: s[4].title,
		text: 'Design a symbol and explain it on a form. The operators put it on the Blob’s public board, and your community can use it to mark events and places.',
		note: 'Example symbols, for illustration.',
		duration: 5.6,
		shot: (t, p) =>
			t < 3.6
				? { target: [6.9, 2.15, -0.1], az: 0, el: 10, w: 5.6, h: 4.3 }
				: { target: [8.1, 1.9, -2.8], az: 12, el: 22, w: p ? 9 : 11, h: 8.4 },
		targets: (t) => ({
			blobSpot: 1,
			form: between(t, 0, 3.3),
			formDraw: after(t, 0.4),
			toBoard: after(t, 2.6),
			symbol: after(t, 3.1),
			pins: after(t, 4.2)
		}),
		labels: [
			{ id: 'pinA', text: 'Sat · open garden', anchor: 'pinA', kind: 'chip', from: 4.6 },
			{ id: 'pinB', text: 'The garden', anchor: 'pinB', kind: 'chip', from: 4.9 }
		]
	},
	{
		id: 'further',
		eyebrow: 'Step 06',
		step: 6,
		title: s[6].title,
		text: s[6].text,
		duration: 13,
		shot: still({ target: [0.5, 0, -1.2], az: 0, el: 50, w: 44, h: 30 }, { w: 40 }),
		targets: (t) => ({
			blobSpot: 1,
			far: 1,
			chains: t < 4.4 ? after(t, 0.6) : 0,
			copies: after(t, 0.6),
			fibre: after(t, 4.4),
			pulse: Math.max(0, Math.min(t - 5, 7.5)) * 0.3
		}),
		labels: [
			{ id: 'blob', text: 'Local Blob', anchor: 'localBlob', kind: 'caption' },
			{ id: 'oa', text: 'Another Blob', anchor: 'otherA' },
			{ id: 'ob', text: 'Another Blob', anchor: 'otherB' },
			{ id: 'oc', text: 'Another Blob', anchor: 'otherC' },
			{ id: 'copies', text: 'Profile copies', anchor: 'stage', kind: 'chip', on: (t) => t < 4.4 },
			{ id: 'fibre', text: 'With electricity: light through fibre', anchor: 'stage', kind: 'chip', from: 4.4, on: true }
		]
	},
	{
		id: 'outro',
		eyebrow: 'A speculative concept, 2026–2035',
		title: 'Get to know your neighbours before you need them.',
		text: 'ANT is a network made of people, places and paper. Start with the kit.',
		logo: true,
		links: [
			{ label: 'Explore the kit', href: '/#the-kit', primary: true },
			{ label: 'Resources', href: '/resources' }
		],
		duration: 2.2,
		shot: still({ target: [0, 0, -1], az: 0, el: 76, w: 46, h: 38 }, { w: 34, h: 44 }),
		targets: () => ({ network: 1, far: 1, green: 1 }),
		labels: []
	}
];

export const chapterIndex = (hash: string) => chapters.findIndex((c) => c.id === hash.replace(/^#/, ''));
