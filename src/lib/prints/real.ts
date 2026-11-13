/**
 * The printed parts of the Blackout Communication Kit, painted on 2D canvases
 * for the 3D models on the homepage and on /explore. Each painter matches a
 * real print: the kit box, the Practise Blackout Cards (box and cards), the
 * Paper Profile, the Interest Token sticker sheet, the Symbol System template
 * and the neighbourhood map.
 *
 * Unit: the point (1/72 in), the print files' own unit, so positions copied
 * from the PDFs (PaperProfileFinal.pdf, Symbolsystem template.pdf) stay
 * recognisable. `mm()` converts. Every painter draws with its top-left at the
 * context origin; the caller sets the scale.
 *
 * The only supplied artwork is the logo (verbatim path data) and the map
 * (rendered from print/antwerp-map). Everything else is drawn here in the
 * four palette colours.
 */
import { LOGO_SYMBOL_PATH, LOGO_WORDMARK_PATHS } from '#lib/brand/logo-paths.js';
import { TOKEN_IDS, drawPicto, type PictoId, type TokenId } from '#lib/components/world/pictos.js';

type Ctx = CanvasRenderingContext2D;

export const INK = { black: '#000000', grey: '#dddddd', white: '#ffffff', green: '#c5d92f' } as const;
export const SANS = '"helvetica-neue-lt-pro", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const DISPLAY = `"evert-pe-vf", ${SANS}`;

/** Millimetres to points. */
export const mm = (v: number) => (v * 72) / 25.4;

/** Real sizes in millimetres (w x h, plus depth for boxes). */
export const SIZE = {
	kit: { w: 240, d: 220, h: 55 },
	cardBox: { w: 66, h: 93, d: 20 },
	card: { w: 63, h: 88 },
	/** A5. The PDF pages are 138 mm wide; their layout is centred on the A5 page. */
	page: { w: 148, h: 210 },
	sheet: { w: 180, h: 190 },
	template: { w: 105, h: 148 },
	/** The A3 map poster. */
	map: { w: 297, h: 420 }
} as const;

/** Size of a print in points. */
export const pts = (s: { w: number; h: number }) => [mm(s.w), mm(s.h)] as const;

/* ---------- text and logo ---------- */

type TextOpts = {
	size: number;
	weight?: 400 | 500 | 700;
	color?: string;
	align?: CanvasTextAlign;
	family?: string;
	italic?: boolean;
	/** Letter spacing in em. */
	spacing?: number;
	baseline?: CanvasTextBaseline;
};

function font(o: TextOpts) {
	return `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${o.size}px ${o.family ?? SANS}`;
}

/** Text with its top at y (the top of the line box, as in the PDF's text boxes). */
export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts) {
	ctx.save();
	ctx.font = font(o);
	ctx.fillStyle = o.color ?? INK.black;
	ctx.textAlign = o.align ?? 'left';
	ctx.textBaseline = o.baseline ?? 'top';
	if (o.spacing) ctx.letterSpacing = `${(o.size * o.spacing).toFixed(3)}px`;
	ctx.fillText(s, x, y);
	ctx.restore();
}

export function measure(ctx: Ctx, s: string, o: TextOpts) {
	ctx.save();
	ctx.font = font(o);
	if (o.spacing) ctx.letterSpacing = `${(o.size * o.spacing).toFixed(3)}px`;
	const w = ctx.measureText(s).width;
	ctx.restore();
	return w;
}

export function wrap(ctx: Ctx, s: string, maxW: number, o: TextOpts): string[] {
	ctx.save();
	ctx.font = font(o);
	const lines: string[] = [];
	let line = '';
	for (const word of s.split(' ')) {
		const next = line ? `${line} ${word}` : word;
		if (line && ctx.measureText(next).width > maxW) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	ctx.restore();
	return lines;
}

/** Bounding boxes of the logo paths, in logo units (viewBox 0 0 900.4 300). */
const SYM = [33.6, 14.6, 309.2, 285.6] as const;
const WORD = [376.4, 63.5, 876, 236] as const;
const SYM_H = SYM[3] - SYM[1];
const WORD_H = WORD[3] - WORD[1];

export type LogoPart = 'full' | 'symbol' | 'wordmark';

/**
 * The supplied logo, from its verbatim paths. (x, y) is the top-left of the
 * symbol (or of the wordmark when only that is drawn); `h` is the symbol's
 * height (the wordmark's for `wordmark`).
 */
export function logo(ctx: Ctx, x: number, y: number, h: number, color: string, part: LogoPart = 'full') {
	const s = h / (part === 'wordmark' ? WORD_H : SYM_H);
	const [ox, oy] = part === 'wordmark' ? [WORD[0], WORD[1]] : [SYM[0], SYM[1]];
	ctx.save();
	ctx.translate(x - ox * s, y - oy * s);
	ctx.scale(s, s);
	ctx.fillStyle = color;
	if (part !== 'wordmark') ctx.fill(new Path2D(LOGO_SYMBOL_PATH), 'evenodd');
	if (part !== 'symbol') for (const d of LOGO_WORDMARK_PATHS) ctx.fill(new Path2D(d));
	ctx.restore();
}

/** Width of the logo drawn at height `h` (same meaning of `h` as in `logo`). */
export function logoWidth(h: number, part: LogoPart = 'full') {
	if (part === 'wordmark') return ((WORD[2] - WORD[0]) * h) / WORD_H;
	return (((part === 'full' ? WORD[2] : SYM[2]) - SYM[0]) * h) / SYM_H;
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w, h);
}

function disc(ctx: Ctx, x: number, y: number, r: number, color: string) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}

/** An interest token: green disc with the pictogram, as on the sticker sheet. */
export function token(ctx: Ctx, id: PictoId, x: number, y: number, r: number, rotate = 0, s = 1) {
	if (s <= 0.01) return;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate((rotate * Math.PI) / 180);
	ctx.scale(s, s);
	disc(ctx, 0, 0, r, INK.green);
	const p = (r * 2 * 46) / 76;
	drawPicto(ctx, id, -p / 2, -p / 2, p);
	ctx.restore();
}

/** Writing by hand, for filled-in prints. */
export function hand(ctx: Ctx, s: string, x: number, y: number, size: number, o: Partial<TextOpts> = {}) {
	text(ctx, s, x, y, { size, italic: true, ...o });
}

/** A hand-written line without words: a wavy stroke revealed by `draw`. */
export function scribble(ctx: Ctx, x: number, y: number, w: number, draw: number, seed = 0, amp = 3.2, lw = 1.3) {
	if (draw <= 0) return;
	const step = amp * 2.3;
	const n = Math.max(2, Math.floor(w / step));
	const upto = Math.min(1, draw) * n;
	const at = (i: number): [number, number] => [
		x + (i / n) * w,
		y + (i === 0 ? 0 : Math.sin(i * 1.7 + seed) * amp + Math.sin(i * 0.6 + seed * 2) * amp * 0.35)
	];
	ctx.save();
	ctx.strokeStyle = INK.black;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(...at(0));
	for (let i = 1; i <= n; i++) {
		if (i <= upto) ctx.lineTo(...at(i));
		else {
			const [ax, ay] = at(i - 1);
			const [bx, by] = at(i);
			const f = upto - (i - 1);
			if (f > 0) ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
			break;
		}
	}
	ctx.stroke();
	ctx.restore();
}

/* ---------- Blackout Communication Kit box (240 x 220 x 55 mm) ---------- */

const KIT_TITLE = [
	{ s: 'COMMUNICATION', color: INK.green },
	{ s: 'BLACKOUT', color: INK.black },
	{ s: 'KIT', color: INK.green }
];

/** Top of the lid: white with the logo and title, a green field below and a green stream down the right. */
export function paintKitLid(ctx: Ctx) {
	const W = mm(SIZE.kit.w);
	const H = mm(SIZE.kit.d);
	rect(ctx, 0, 0, W, H, INK.white);
	ctx.save();
	ctx.scale(mm(1), mm(1));
	ctx.fillStyle = INK.green;
	ctx.fillRect(0, 118, 240, 102);
	ctx.beginPath();
	ctx.moveTo(196, 0);
	ctx.lineTo(240, 0);
	ctx.lineTo(240, 18);
	ctx.bezierCurveTo(229, 30, 215, 44, 214, 64);
	ctx.bezierCurveTo(213, 86, 228, 100, 240, 108);
	ctx.lineTo(240, 119);
	ctx.lineTo(170, 119);
	ctx.bezierCurveTo(186, 104, 203, 88, 204, 64);
	ctx.bezierCurveTo(205, 42, 194, 22, 196, 0);
	ctx.closePath();
	ctx.fill();
	ctx.restore();

	logo(ctx, mm(16), mm(15), mm(20), INK.black);
	const base: TextOpts = { size: 100 };
	const size = (100 * mm(118)) / measure(ctx, KIT_TITLE[0].s, base);
	KIT_TITLE.forEach((l, i) => text(ctx, l.s, mm(15), mm(50 + i * 21), { size, color: l.color }));
}

/** Front wall: green, with the thumb notch and the symbol. */
export function paintKitFront(ctx: Ctx) {
	const W = mm(SIZE.kit.w);
	const H = mm(SIZE.kit.h);
	rect(ctx, 0, 0, W, H, INK.green);
	ctx.save();
	ctx.strokeStyle = INK.black;
	ctx.lineWidth = 0.8;
	ctx.beginPath();
	ctx.arc(W / 2, 0, mm(10), 0, Math.PI);
	ctx.stroke();
	ctx.restore();
	const h = mm(11);
	logo(ctx, W / 2 - logoWidth(h, 'symbol') / 2, mm(31), h, INK.black, 'symbol');
}

/** Back wall: the full name, initials in green. */
export function paintKitBack(ctx: Ctx) {
	const W = mm(SIZE.kit.w);
	const H = mm(SIZE.kit.h);
	rect(ctx, 0, 0, W, H, INK.white);
	const words = ['ADAPTIVE', 'NETWORK', 'OF', 'TRUST'];
	const o: TextOpts = { size: 100, spacing: 0.12 };
	const full = words.join(' ');
	const size = (100 * mm(118)) / measure(ctx, full, o);
	const so = { ...o, size };
	let x = (W - measure(ctx, full, so)) / 2;
	const y = H / 2 - size * 0.36;
	for (const [i, w] of words.entries()) {
		const initial = w === 'OF' ? '' : w[0];
		const rest = w === 'OF' ? w : w.slice(1);
		if (initial) {
			text(ctx, initial, x, y, { ...so, color: INK.green, baseline: 'alphabetic' });
			x += measure(ctx, initial, so);
		}
		text(ctx, rest, x, y, { ...so, baseline: 'alphabetic' });
		x += measure(ctx, rest + (i < words.length - 1 ? ' ' : ''), so);
	}
}

/* ---------- Practise Blackout Cards: box (66 x 93 x 20 mm) and cards (63 x 88 mm) ---------- */

export type BlackoutCard = { title: string; scenario: string; challenge: string };

/** The five cards, as printed (spelling of Blob made consistent). */
export const BLACKOUT_CARDS: BlackoutCard[] = [
	{
		title: 'No signal!',
		scenario: 'The internet and mobile network are down. You need to inform your neighbours about a meeting at the community Blob.',
		challenge: 'How can you spread this message without using a phone or the internet?'
	},
	{
		title: 'Water supply',
		scenario: 'The water is running low. As a neighbourhood, you need to decide how to share what’s left.',
		challenge: 'How do you organise a fair and practical distribution together?'
	},
	{
		title: 'A neighbour in need',
		scenario: 'A neighbour is elderly and lives alone. The power is out and it’s getting cold.',
		challenge: 'How can you check in, offer support and make sure they are safe?'
	},
	{
		title: 'Find the Blob',
		scenario: 'The usual route to your community Blob is blocked.',
		challenge: 'Use the neighbourhood map to find an alternative route.'
	},
	{
		title: 'Without words',
		scenario: 'You meet someone who doesn’t speak your language. They urgently need to find the nearest help point.',
		challenge: 'How can you communicate the correct directions using only gestures and pictograms?'
	}
];

/** Three people, the "group" mark on the cards and the box. */
function people(ctx: Ctx, x: number, y: number, s: number, lw: number) {
	ctx.save();
	ctx.strokeStyle = INK.black;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	for (let i = 0; i < 3; i++) {
		const cx = x + s * (0.2 + i * 0.3);
		ctx.beginPath();
		ctx.arc(cx, y + s * 0.28, s * 0.12, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(cx, y + s * 0.8, s * 0.18, Math.PI, 0);
		ctx.stroke();
	}
	ctx.restore();
}

function clock(ctx: Ctx, x: number, y: number, s: number, lw: number) {
	ctx.save();
	ctx.strokeStyle = INK.black;
	ctx.lineWidth = lw;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.arc(x + s / 2, y + s / 2, s / 2 - lw / 2, 0, Math.PI * 2);
	ctx.moveTo(x + s / 2, y + s * 0.22);
	ctx.lineTo(x + s / 2, y + s / 2);
	ctx.lineTo(x + s * 0.72, y + s * 0.62);
	ctx.stroke();
	ctx.restore();
}

/** Front of the card box. */
export function paintCardBoxFront(ctx: Ctx) {
	const W = mm(SIZE.cardBox.w);
	const H = mm(SIZE.cardBox.h);
	rect(ctx, 0, 0, W, H, INK.white);
	ctx.save();
	ctx.scale(mm(1), mm(1));
	ctx.fillStyle = INK.green;
	// thumb notch, showing the green tuck flap
	ctx.beginPath();
	ctx.arc(49, 0, 6, 0, Math.PI);
	ctx.fill();
	// the green field in the bottom-right corner
	ctx.beginPath();
	ctx.moveTo(66, 46);
	ctx.bezierCurveTo(50, 46, 37, 62, 32, 93);
	ctx.lineTo(66, 93);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	logo(ctx, mm(7.5), mm(18), mm(8.5), INK.black);
	const size = mm(5.2);
	text(ctx, 'PRACTISE', mm(7.5), mm(35), { size, color: INK.green });
	text(ctx, 'BLACKOUT', mm(7.5), mm(41.5), { size });
	text(ctx, 'CARDS', mm(7.5), mm(48), { size, color: INK.green });
	['Build trust,', 'work together', 'and train skills', 'before a real', 'blackout happens.'].forEach((l, i) =>
		text(ctx, l, mm(7.5), mm(64 + i * 3.7), { size: mm(3) })
	);
}

/** Back of the card box: how to play. */
export function paintCardBoxBack(ctx: Ctx) {
	const W = mm(SIZE.cardBox.w);
	const H = mm(SIZE.cardBox.h);
	rect(ctx, 0, 0, W, H, INK.white);
	const x = mm(7.5);
	text(ctx, 'How does it work?', x, mm(10), { size: mm(3.6), weight: 700, color: INK.green });
	const steps = [
		['Draw a card', 'Each card presents a', 'realistic blackout scenario.'],
		['Discuss or act it out', 'Find a solution together', 'without digital technology.'],
		['Reflect', 'What worked well?', 'What can you improve?']
	];
	steps.forEach((lines, i) => {
		const y = mm(21 + i * 15);
		disc(ctx, x + mm(2.4), y + mm(2), mm(2.4), INK.green);
		text(ctx, String(i + 1), x + mm(2.4), y + mm(0.6), { size: mm(2.9), weight: 700, align: 'center' });
		text(ctx, lines[0], x + mm(7.5), y, { size: mm(3.4), weight: 700 });
		text(ctx, lines[1], x + mm(7.5), y + mm(4.2), { size: mm(3.1) });
		text(ctx, lines[2], x + mm(7.5), y + mm(7.9), { size: mm(3.1) });
	});
	clock(ctx, x, mm(73.5), mm(3.4), 0.9);
	text(ctx, '15 minutes', x + mm(6), mm(73.8), { size: mm(3) });
	people(ctx, x - mm(0.3), mm(78.6), mm(4), 0.8);
	text(ctx, '2–8 people', x + mm(6), mm(79.3), { size: mm(3) });
	void H;
}

/** Face of a card. Corners outside the rounded edge stay transparent. */
export function paintCard(ctx: Ctx, n: number) {
	const card = BLACKOUT_CARDS[n];
	const W = mm(SIZE.card.w);
	const H = mm(SIZE.card.h);
	ctx.save();
	roundRect(ctx, 0, 0, W, H, mm(3.5));
	ctx.fillStyle = INK.white;
	ctx.fill();
	// the green frame, with a rule under the header and one above the challenge
	ctx.strokeStyle = INK.green;
	ctx.lineWidth = mm(1.5);
	roundRect(ctx, mm(4), mm(4), W - mm(8), H - mm(8), mm(3));
	ctx.stroke();
	rect(ctx, mm(4), mm(12.4), W - mm(8), mm(0.6), INK.green);
	rect(ctx, mm(4), mm(51), W - mm(8), mm(0.6), INK.green);
	// the number tab on the top-right corner
	const tx = W - mm(8.5);
	const ty = mm(6.2);
	ctx.fillStyle = INK.green;
	ctx.beginPath();
	ctx.arc(tx, ty, mm(3), 0, Math.PI * 2);
	ctx.moveTo(tx - mm(1.2), ty + mm(2.4));
	ctx.lineTo(tx - mm(2.6), ty + mm(5));
	ctx.lineTo(tx + mm(0.6), ty + mm(2.8));
	ctx.fill();
	text(ctx, String(n + 1).padStart(2, '0'), tx, ty - mm(1.3), { size: mm(2.5), weight: 700, align: 'center' });

	const x = mm(7.5);
	const tw = W - mm(15);
	text(ctx, 'Practice blackout card', x, mm(7.6), { size: mm(2.7) });
	const titleSize = mm(4.6);
	wrap(ctx, card.title, tw, { size: titleSize, family: DISPLAY, weight: 500 }).forEach((l, i) =>
		text(ctx, l, x, mm(17.5) + i * titleSize * 1.1, { size: titleSize, family: DISPLAY, weight: 500 })
	);
	const body = { size: mm(2.75) };
	wrap(ctx, card.scenario, tw, body).forEach((l, i) => text(ctx, l, x, mm(26) + i * mm(3.3), body));
	people(ctx, x, mm(55), mm(3.6), 0.7);
	text(ctx, 'YOUR CHALLENGE', x + mm(5.2), mm(55.6), { size: mm(2.9) });
	wrap(ctx, card.challenge, tw, body).forEach((l, i) => text(ctx, l, x, mm(62) + i * mm(3.3), body));
	ctx.restore();
}

/** Back of every card: green with a white edge and the symbol. */
export function paintCardBack(ctx: Ctx) {
	const W = mm(SIZE.card.w);
	const H = mm(SIZE.card.h);
	roundRect(ctx, 0, 0, W, H, mm(3.5));
	ctx.fillStyle = INK.white;
	ctx.fill();
	roundRect(ctx, mm(3), mm(3), W - mm(6), H - mm(6), mm(2.2));
	ctx.fillStyle = INK.green;
	ctx.fill();
	const h = mm(14);
	logo(ctx, W / 2 - logoWidth(h, 'symbol') / 2, H / 2 - h / 2, h, INK.black, 'symbol');
}

/* ---------- Paper Profile (pages of 138 x 210 mm), positions from PaperProfileFinal.pdf ---------- */

export const PAGE_W = mm(SIZE.page.w);
/** Where the PDF's 138 mm layout starts on the A5 page. */
const PAGE_X = (PAGE_W - 391.18) / 2;
export const PAGE_H = 595.28;
/** Radius of the dashed circles (and of a token, 25 mm). */
export const TOKEN_R = 35.05;
const TOKEN_X = [100.17, 209.77, 319.37];
const TOKEN_Y = [184.1, 288.95];
/** Centre of circle i (0..5, row by row) on the interests page. */
const circle = (i: number): [number, number] => [TOKEN_X[i % 3], TOKEN_Y[Math.floor(i / 3) % 2]];
export const circleCenter = (i: number): [number, number] => [circle(i)[0] + PAGE_X, circle(i)[1]];

export type ProfileData = {
	name: string;
	street: string;
	picto: PictoId;
	tokens: TokenId[];
	tokenLabels: string[];
	also?: string;
	canHelp?: string;
	useHelp?: string;
};

export type ProfileAnim = {
	/** 0..1 each, 1 = done. */
	photo?: number;
	name?: number;
	story?: number;
	/** Scale of each token (0 = not stuck on yet). */
	tokens?: number[];
	written?: number;
	/** 0..1: the interests page is covered (private profile). */
	cover?: number;
	/** Leave these tokens out (another layer draws them). */
	hideTokens?: number[];
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const typed = (s: string, t: number) => s.slice(0, Math.round(s.length * clamp01(t)));

const LABEL: TextOpts = { size: 6.5, weight: 700, spacing: 0.1 };

/** Page header: numbered green dot, section name, PAPER PROFILE on the right. */
function header(ctx: Ctx, left: number, right: number, n: string, name: string) {
	disc(ctx, left + 9.2, 34.35, 9.2, INK.green);
	text(ctx, n, left + 9.2, 30, { ...LABEL, align: 'center', spacing: 0 });
	text(ctx, name, left + 24.1, 30, LABEL);
	text(ctx, 'PAPER PROFILE', right, 30, { ...LABEL, align: 'right' });
	rect(ctx, left, 50.3, right - left, 0.7, INK.black);
}

/** Front cover: picture frame and "Hello, I'm". */
export function paintProfileCover(ctx: Ctx, p: ProfileData | null, a: ProfileAnim = {}) {
	const { photo = 1, name = 1 } = a;
	rect(ctx, 0, 0, PAGE_W, PAGE_H, INK.green);
	ctx.save();
	ctx.translate(PAGE_X, 0);
	logo(ctx, 53.9, 25.5, 17.7, INK.black);
	text(ctx, 'PAPER PROFILE', 365.1, 30, { ...LABEL, align: 'right' });
	rect(ctx, 53.8, 50.3, 311.9, 0.7, INK.black);
	for (const [x, y, w, h] of [
		[62.3, 87.9, 14.2, 0.7], [62.3, 87.9, 0.8, 14.1], [343, 87.9, 14.2, 0.7], [356.4, 87.9, 0.8, 14.1],
		[62.3, 364.9, 14.2, 0.8], [62.3, 351.5, 0.8, 14.2], [343, 364.9, 14.2, 0.8], [356.4, 351.5, 0.8, 14.2]
	])
		rect(ctx, x, y, w, h, INK.black);
	if (p && photo > 0) {
		// A pasted photo: a white print with the person on it.
		ctx.save();
		ctx.globalAlpha = clamp01(photo * 1.5);
		const lift = (1 - clamp01(photo)) * 30;
		rect(ctx, 76, 100 - lift, 267, 252, INK.white);
		ctx.beginPath();
		ctx.rect(76, 100 - lift, 267, 252);
		ctx.clip();
		drawPicto(ctx, p.picto, 210 - 105, 140 - lift, 210);
		ctx.restore();
	} else {
		text(ctx, 'YOUR PICTURE', 209.75, 210.5, { ...LABEL, align: 'center' });
		text(ctx, 'Paste a photo here,', 209.8, 223.7, { size: 7, align: 'center' });
		text(ctx, 'or draw yourself.', 209.8, 232.8, { size: 7, align: 'center' });
	}
	text(ctx, 'Hello, I’m', 53.8, 456.4, { size: 30, family: DISPLAY, weight: 500 });
	if (p) hand(ctx, typed(p.name, name), 56, 498, 32);
	rect(ctx, 53.8, 539.2, 311.9, 0.8, INK.black);
	text(ctx, 'Write the name you like to be called.', 53.8, 544.1, { size: 7 });
	ctx.restore();
}

/** Page 01: My story. */
export function paintProfileStory(ctx: Ctx, p: ProfileData | null, a: ProfileAnim = {}) {
	const { story = 1, name = 1 } = a;
	rect(ctx, 0, 0, PAGE_W, PAGE_H, INK.white);
	ctx.save();
	ctx.translate(PAGE_X, 0);
	header(ctx, 25.5, 337.3, '01', 'STORY');
	text(ctx, 'My story', 25.5, 64.9, { size: 30, family: DISPLAY, weight: 500 });
	text(ctx, 'Who are you, and what would you like your neighbours to know?', 25.5, 108.7, { size: 8.5 });
	text(ctx, 'A few lines are enough.', 25.5, 120.2, { size: 8.5 });
	for (let k = 0; k < 12; k++) rect(ctx, 25.5, 163.5 + k * 24.1, 311.8, 0.75, INK.black);
	if (p) {
		const lines = 5;
		for (let k = 0; k < lines; k++)
			scribble(ctx, 28, 152 + k * 24.1, k === lines - 1 ? 160 : 290, story * lines - k, k * 3 + p.name.length, 3.6, 1.4);
	}
	text(ctx, 'WHERE TO FIND ME', 25.5, 526.2, LABEL);
	if (p) hand(ctx, typed(p.street, name), 27, 538, 13);
	rect(ctx, 25.5, 555.7, 311.8, 0.7, INK.black);
	text(ctx, 'A street, a square, a regular spot. Share only what you are comfortable with.', 25.5, 560.6, { size: 7 });
	ctx.restore();
}

/** Page 02: What I'm into (interest tokens), 03 and 04. */
export function paintProfileInterests(ctx: Ctx, p: ProfileData | null, a: ProfileAnim = {}) {
	const { tokens, written = 1, cover = 0, hideTokens = [] } = a;
	rect(ctx, 0, 0, PAGE_W, PAGE_H, INK.white);
	ctx.save();
	ctx.translate(PAGE_X, 0);
	header(ctx, 53.8, 365.7, '02', 'INTERESTS');
	text(ctx, 'What I’m into', 53.8, 64.9, { size: 30, family: DISPLAY, weight: 500 });
	text(ctx, 'Stick an interest token in each circle and name it, or write your', 53.8, 108.7, { size: 8.5 });
	text(ctx, 'own below.', 53.8, 120.2, { size: 8.5 });
	ctx.save();
	ctx.strokeStyle = INK.black;
	ctx.lineWidth = 0.75;
	ctx.setLineDash([2.21, 1.46]);
	for (let i = 0; i < 6; i++) {
		const [x, y] = circle(i);
		ctx.beginPath();
		ctx.arc(x, y, TOKEN_R, 0, Math.PI * 2);
		ctx.stroke();
	}
	ctx.restore();
	for (const y of [238.6, 343.5]) for (const x of [53.8, 163.4, 273]) rect(ctx, x, y, 92.6, 0.8, INK.black);
	text(ctx, 'ALSO', 53.8, 360.2, LABEL);
	rect(ctx, 53.8, 389.7, 311.9, 0.7, INK.black);
	for (const [x, n, s] of [[53.8, '03', 'I CAN HELP WITH'], [218.2, '04', 'I COULD USE HELP WITH']] as const) {
		disc(ctx, x + 9.25, 488.3, 9.2, INK.green);
		text(ctx, n, x + 9.25, 483.9, { ...LABEL, align: 'center', spacing: 0 });
		text(ctx, s, x + 24.1, 483.9, LABEL);
		for (const y of [520.8, 544.9, 569]) rect(ctx, x, y, 147.4, 0.8, INK.black);
	}

	if (p) {
		p.tokens.forEach((t, i) => {
			const [x, y] = circle(i);
			const s = tokens ? (tokens[i] ?? 0) : 1;
			if (!hideTokens.includes(i)) token(ctx, t, x, y, TOKEN_R - 0.4, (i % 2 ? 1 : -1) * 6, s);
			ctx.save();
			ctx.globalAlpha = clamp01(s);
			hand(ctx, p.tokenLabels[i], x, y + 41, 12, { align: 'center' });
			ctx.restore();
		});
		if (p.also && written > 0) hand(ctx, typed(p.also, written * 1.4), 56, 371, 13);
		if (p.canHelp && written > 0) hand(ctx, typed(p.canHelp, written * 1.4 - 0.2), 55, 503, 12);
		if (p.useHelp && written > 0) hand(ctx, typed(p.useHelp, written * 1.4 - 0.4), 219.5, 503, 12);
	}
	ctx.restore();

	if (cover > 0.001) {
		const top = 52 + (1 - cover) * (PAGE_H - 52);
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, top, PAGE_W, PAGE_H - top);
		ctx.clip();
		rect(ctx, 0, top, PAGE_W, PAGE_H - top, INK.black);
		const mid = top + (PAGE_H - 52) / 2;
		text(ctx, 'PRIVATE', PAGE_W / 2, mid - 40, { size: 26, weight: 700, spacing: 0.08, color: INK.white, align: 'center' });
		text(ctx, 'Ask at the Blob', PAGE_W / 2, mid + 2, { size: 22, color: INK.white, align: 'center' });
		text(ctx, 'to see more', PAGE_W / 2, mid + 30, { size: 22, color: INK.white, align: 'center' });
		ctx.restore();
	}
}

/** Back cover: green with the symbol. */
export function paintProfileBack(ctx: Ctx) {
	rect(ctx, 0, 0, PAGE_W, PAGE_H, INK.green);
	logo(ctx, 146.3 + PAGE_X, 235.5, 124.3, INK.black, 'symbol');
}

export type ProfilePage = 'cover' | 'story' | 'interests';

/** Pages side by side, starting at the context origin. */
export function paintProfilePages(ctx: Ctx, pages: ProfilePage[], p: ProfileData | null, a: ProfileAnim = {}) {
	pages.forEach((page, i) => {
		ctx.save();
		ctx.translate(i * PAGE_W, 0);
		if (page === 'cover') paintProfileCover(ctx, p, a);
		else if (page === 'story') paintProfileStory(ctx, p, a);
		else paintProfileInterests(ctx, p, a);
		ctx.restore();
	});
}

/* ---------- Interest Token sticker sheet (180 x 190 mm) ---------- */

export const SHEET_W = mm(SIZE.sheet.w);
export const SHEET_H = mm(SIZE.sheet.h);
const SHEET_PITCH = 31;
/** Centre of sticker i (0..19, row by row, in TOKEN_IDS order). */
export const stickerCenter = (i: number): [number, number] => [
	mm(90 + ((i % 5) - 2) * SHEET_PITCH),
	mm(50 + Math.floor(i / 5) * SHEET_PITCH)
];
export const stickerIndex = (id: TokenId) => TOKEN_IDS.indexOf(id);

/** The sheet: green, logo on top, 20 kiss-cut stickers. Peeled ones show the white liner. */
export function paintStickerSheet(ctx: Ctx, peeled: number[] = []) {
	rect(ctx, 0, 0, SHEET_W, SHEET_H, INK.green);
	const h = mm(13);
	logo(ctx, SHEET_W / 2 - logoWidth(h) / 2, mm(14), h, INK.black);
	TOKEN_IDS.forEach((id, i) => {
		const [x, y] = stickerCenter(i);
		if (peeled.includes(i)) {
			disc(ctx, x, y, TOKEN_R, INK.white);
			return;
		}
		ctx.save();
		ctx.globalAlpha = 0.45;
		ctx.strokeStyle = INK.white;
		ctx.lineWidth = 0.7;
		ctx.beginPath();
		ctx.arc(x, y, TOKEN_R, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
		token(ctx, id, x, y, TOKEN_R);
	});
}

/* ---------- Symbol System template (A6), positions from Symbolsystem template.pdf ---------- */

export const TEMPLATE_W = mm(SIZE.template.w);
export const TEMPLATE_H = mm(SIZE.template.h);
/** The drawing box. */
export const TEMPLATE_BOX = { x: 22.9, y: 66.1, w: 243.3, h: 174.1 } as const;

/** The hand-drawn example symbol on the first template ("club/party"), traced from the PDF. */
const CLUB_SYMBOL = [
	'M156.8 87.7C166.3 87.2 177.9 86.5 187.6 86.0C197.0 85.5 206.1 85.2 215.4 86.5C217.6 86.8 219.4 88.1 219.5 90.5C220.0 94.9 219.2 100.1 219.0 104.3C219.0 109.6 218.9 117.9 218.9 124.1C218.9 126.8 218.7 128.7 218.4 131.4C217.3 140.1 218.0 149.0 219.2 157.5C219.6 165.2 219.7 174.9 220.3 182.7C220.9 196.2 218.9 202.8 204.0 204.3C195.5 205.1 185.7 205.7 177.4 206.1C155.2 206.5 126.6 206.2 103.8 210.8C99.0 211.9 92.8 212.2 87.9 212.7C84.8 213.1 82.4 212.6 79.2 212.4C74.8 211.9 70.3 212.2 66.8 210.0C65.4 209.2 63.4 208.4 63.6 206.5C65.1 199.8 68.0 192.0 68.8 185.8C69.6 180.5 70.6 173.7 71.2 169.4C71.9 160.0 72.7 148.8 72.9 141.2C73.1 134.5 73.2 124.8 73.4 117.9C73.5 116.5 73.6 113.6 73.9 111.3C74.6 107.1 75.8 102.9 73.9 98.8C72.8 96.2 73.7 94.8 73.6 91.7C73.5 89.6 72.7 86.9 74.1 85.1C75.0 84.1 76.4 82.9 77.7 83.4C80.3 84.9 80.3 90.6 82.1 92.2C83.4 93.0 84.7 91.7 86.1 91.6C107.6 89.2 133.6 87.9 156.7 87.7L156.8 87.7M75.0 111.7C75.0 111.8 75.0 112.4 75.0 112.0C75.1 111.7 75.1 111.3 75.1 110.9C75.0 110.3 75.0 111.4 75.0 111.6L75.0 111.7M203.8 97.8C202.3 96.4 199.4 96.6 197.2 96.0C189.8 94.4 182.5 95.5 175.0 95.8C151.3 97.1 123.6 98.3 105.1 99.1C99.6 99.3 88.9 99.9 84.1 100.1C83.5 100.2 82.9 100.2 82.6 100.7C82.6 101.1 82.5 101.5 82.5 101.9C83.3 114.2 83.4 127.2 83.6 142.6C84.2 160.6 82.0 178.1 78.3 195.6C77.0 200.8 81.3 202.7 85.9 201.8C94.6 200.9 107.6 200.0 116.7 199.0C143.9 195.8 171.5 197.1 198.7 195.4C203.5 195.7 205.9 192.5 205.7 188.0C205.2 169.8 206.6 157.3 206.2 129.2C206.4 122.1 204.9 115.2 204.1 108.0C203.6 104.8 205.2 100.7 203.9 97.9L203.8 97.8Z',
	'M200.4 128.1L198.2 131.3C191.8 138.5 186.4 145.9 181.8 154.4C176.9 163.6 175.0 164.4 165.5 165.8C162.7 166.2 160.3 166.1 158.5 163.5C156.1 160.1 154.2 156.3 152.4 152.4L150.8 148.8L148.9 145.5L147.1 149.4C144.3 155.1 141.0 162.5 135.1 164.1C133.0 164.8 130.4 164.8 128.2 165.2C124.6 165.9 121.3 165.2 119.0 162.0L109.2 148.7C103.1 157.0 100.3 172.0 91.0 168.9L87.8 171.5C87.3 168.7 88.1 166.2 90.2 164.2C93.5 156.8 96.9 149.3 102.0 143.1C105.2 139.3 109.4 137.0 113.6 134.6C118.7 138.4 123.4 145.2 127.0 150.5C128.6 152.9 130.2 155.2 132.9 156.3L140.8 140.6C142.3 137.6 144.7 134.9 147.5 133.2L150.8 131.2L156.3 128.5L160.0 136.3C163.2 142.9 165.4 149.5 169.4 156.0L174.6 148.2C179.2 141.2 184.0 134.4 190.7 129.2C192.4 128.7 194.1 128.1 195.7 127.3L199.5 126.4L199.2 128.1C199.1 128.4 200.1 128.2 200.4 128.1Z'
];

export type TemplateFill = {
	/** A pictogram drawn in the box (revealed by `draw`), or the printed example. */
	symbol?: PictoId | 'club';
	draw?: number;
	meaning?: string;
	mark?: string;
	/** 0..1: how much of the two answers is written. */
	write?: number;
};

export const CLUB_EXAMPLE: TemplateFill = { symbol: 'club', meaning: 'club/party', mark: 'a location or an upcoming event' };

export function paintTemplate(ctx: Ctx, f: TemplateFill = {}) {
	const { draw = 1, write = 1 } = f;
	rect(ctx, 0, 0, TEMPLATE_W, TEMPLATE_H, INK.white);
	logo(ctx, 247.6, 13.2, 9.5, INK.green, 'wordmark');
	const small: TextOpts = { size: 10.1 };
	const big: TextOpts = { size: 18.7 };
	text(ctx, 'NEW SYMBOL', 22.9, 37.1, small);
	const b = TEMPLATE_BOX;
	ctx.save();
	ctx.strokeStyle = INK.black;
	ctx.lineWidth = 0.6;
	ctx.strokeRect(b.x, b.y, b.w, b.h);
	ctx.restore();
	if (f.symbol === 'club') {
		ctx.fillStyle = INK.black;
		for (const d of CLUB_SYMBOL) ctx.fill(new Path2D(d));
	} else if (f.symbol) {
		const s = 140;
		drawPicto(ctx, f.symbol, b.x + b.w / 2 - s / 2, b.y + b.h / 2 - s / 2, s, clamp01(draw));
	}
	text(ctx, 'MEANING', 22.9, 264.2, small);
	if (f.meaning) text(ctx, typed(f.meaning, write * 2.2 - 0.2), 22.9, 278.5, big);
	text(ctx, 'USE IT TO MARK', 22.9, 334.2, small);
	if (f.mark)
		wrap(ctx, typed(f.mark, write * 2.2 - 1.1), 250, big).forEach((l, i) => text(ctx, l, 22.9, 348.5 + i * 22.4, big));
}

/* ---------- Neighbourhood map (A3 poster) ---------- */

export const MAP_URL = '/prints/neighbourhood-map.jpg';
export const MAP_W = mm(SIZE.map.w);
export const MAP_H = mm(SIZE.map.h);

let mapImage: Promise<HTMLImageElement | null> | null = null;
let mapLoaded: HTMLImageElement | null = null;
/** The A3 map, rendered from print/antwerp-map. Resolves to null if it can't load. */
export function loadMap(): Promise<HTMLImageElement | null> {
	if (!mapImage)
		mapImage = new Promise((resolve) => {
			const img = new Image();
			img.decoding = 'async';
			img.onload = () => resolve((mapLoaded = img));
			img.onerror = () => resolve(null);
			img.src = MAP_URL;
		});
	return mapImage;
}
/** The map image if `loadMap()` has finished, else null. */
export const loadedMap = () => mapLoaded;

/** The whole A3 poster. */
export function paintMap(ctx: Ctx, img: HTMLImageElement | null) {
	rect(ctx, 0, 0, MAP_W, MAP_H, INK.white);
	if (img) ctx.drawImage(img, 0, 0, MAP_W, MAP_H);
	else {
		text(ctx, 'A Blob within walking distance', 50, 830, { size: 30, weight: 700 });
		text(ctx, 'of school, care and food.', 50, 866, { size: 30, weight: 700 });
	}
}
