/**
 * Paper for the diorama: 2D-canvas painters for the printed things (profiles,
 * kit cards, signage, symbol board, form), in the same layouts as the
 * explainer video's parts, in the ANT palette.
 * The only supplied artwork is the logo, painted from its original path data.
 */
import { CanvasTexture, SRGBColorSpace } from 'three';
import { LOGO_SYMBOL_PATH } from '#lib/brand/logo-paths.js';
import { P } from './layout.js';
import { drawPicto, type PictoId } from './pictos.js';

type Ctx = CanvasRenderingContext2D;

export const SANS = '"helvetica-neue-lt-pro", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const DISPLAY = `"evert-pe-vf", ${SANS}`;

/** Waits for the two Adobe Fonts kits, so canvas text uses them. */
export async function loadPrintFonts() {
	try {
		await Promise.race([
			Promise.all([
				document.fonts.load('700 40px "helvetica-neue-lt-pro"'),
				document.fonts.load('400 40px "helvetica-neue-lt-pro"'),
				document.fonts.load('italic 400 40px "helvetica-neue-lt-pro"'),
				document.fonts.load('500 40px "evert-pe-vf"')
			]),
			new Promise((r) => setTimeout(r, 2500))
		]);
	} catch {
		/* fall back to system Helvetica/Arial */
	}
}

/** A canvas-backed texture, painted in design pixels (w x h) at `scale`. */
export type Print = {
	texture: CanvasTexture;
	w: number;
	h: number;
	paint(draw: (ctx: Ctx) => void): void;
};

export function print(w: number, h: number, scale = 2, draw?: (ctx: Ctx) => void): Print {
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(w * scale);
	canvas.height = Math.round(h * scale);
	const ctx = canvas.getContext('2d')!;
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	// Prints are often seen much smaller than they are painted: mipmaps keep thin lines whole.
	texture.anisotropy = 4;
	const p: Print = {
		texture,
		w,
		h,
		paint(fn) {
			ctx.setTransform(scale, 0, 0, scale, 0, 0);
			ctx.clearRect(0, 0, w, h);
			fn(ctx);
			texture.needsUpdate = true;
		}
	};
	if (draw) p.paint(draw);
	return p;
}

/* ---------- text ---------- */

type TextOpts = { size: number; weight?: 400 | 500 | 700; color?: string; align?: CanvasTextAlign; italic?: boolean; family?: string };

/** Text with its top-left (or top-centre / top-right) at (x, y). */
function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts) {
	ctx.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${o.size}px ${o.family ?? SANS}`;
	ctx.fillStyle = o.color ?? P.black;
	ctx.textAlign = o.align ?? 'left';
	ctx.textBaseline = 'top';
	ctx.fillText(s, x, y);
}

/** Small uppercase meta label, as on the site. */
function label(ctx: Ctx, s: string, x: number, y: number, size: number, color: string = P.black, align: CanvasTextAlign = 'left') {
	ctx.save();
	ctx.letterSpacing = `${(size * 0.08).toFixed(2)}px`;
	text(ctx, s.toUpperCase(), x, y, { size, weight: 700, color, align });
	ctx.restore();
}

function wrap(ctx: Ctx, s: string, maxW: number): string[] {
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
	return lines;
}

/** The supplied ANT symbol (verbatim path, evenodd cutout). */
function drawSymbol(ctx: Ctx, x: number, y: number, height: number, color: string) {
	const s = height / 300;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(s, s);
	ctx.translate(-15, 0);
	ctx.fillStyle = color;
	ctx.fill(new Path2D(LOGO_SYMBOL_PATH), 'evenodd');
	ctx.restore();
}

/** A hand-written line: a wavy stroke, so it reads as writing without fake text. */
function scribble(ctx: Ctx, x: number, y: number, w: number, draw: number, seed = 0) {
	if (draw <= 0) return;
	const n = Math.floor(w / 14);
	const upto = draw * n;
	ctx.save();
	ctx.strokeStyle = P.black;
	ctx.lineWidth = 3;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(x + 2, y + 12);
	const at = (i: number): [number, number] => [
		x + (i / n) * (w - 4) + 2,
		y + 12 + (i === 0 ? 0 : Math.sin(i * 1.7 + seed) * 6 + Math.sin(i * 0.6 + seed * 2) * 2)
	];
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

/* ---------- interest tokens ---------- */

export const TOKEN_R = 38;

function token(ctx: Ctx, id: PictoId, x: number, y: number, s = 1, rotate = 0) {
	if (s <= 0.01) return;
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate((rotate * Math.PI) / 180);
	ctx.scale(s, s);
	ctx.fillStyle = P.green;
	ctx.beginPath();
	ctx.arc(0, 0, TOKEN_R, 0, Math.PI * 2);
	ctx.fill();
	drawPicto(ctx, id, -23, -23, 46);
	ctx.restore();
}

/** A loose token on a transparent 96x96 canvas (for tokens in flight). */
export const paintToken = (id: PictoId) => (ctx: Ctx) => token(ctx, id, 48, 48, 48 / TOKEN_R - 0.02);

/* ---------- paper profile (460 x 620) ---------- */

export const CARD_W = 460;
export const CARD_H = 620;
/** Token centre inside a profile card, in card pixels. */
export const tokenCenter = (i: number): [number, number] => [70 + i * 92, 498];

export type ProfileData = { name: string; street: string; picto: PictoId; tokens: PictoId[]; tokenLabels: string[]; written?: string };

export const NOOR: ProfileData = {
	name: 'Noor',
	street: 'Linden Street',
	picto: 'person2',
	tokens: ['leaf', 'bike', 'note'],
	tokenLabels: ['Gardening', 'Cycling', 'Music'],
	written: 'fixing radios'
};
export const SAM: ProfileData = { name: 'Sam', street: 'Mill Lane', picto: 'person', tokens: ['pot', 'leaf'], tokenLabels: ['Cooking', 'Gardening'] };
export const ADA: ProfileData = { name: 'Ada', street: 'Canal Row', picto: 'person2', tokens: ['note', 'pot'], tokenLabels: ['Music', 'Cooking'] };
export const ILYAS: ProfileData = { name: 'Ilyas', street: 'Station Road', picto: 'person', tokens: ['bike'], tokenLabels: ['Cycling'], written: 'chess' };

export type ProfileAnim = {
	photo?: number;
	name?: number;
	story?: number;
	/** Scale of each token (0 = not stuck on yet). */
	tokens?: number[];
	written?: number;
	/** 0..1: black cover over everything but the name and picture (private profile). */
	cover?: number;
	/** Leave these tokens out (another layer draws them, e.g. as blobs). */
	hideTokens?: number[];
};

export function paintProfile(ctx: Ctx, p: ProfileData, a: ProfileAnim = {}, bare = false) {
	const { photo = 1, name = 1, story = 1, tokens, written = 1, cover = 0, hideTokens = [] } = a;
	if (!bare) {
		ctx.fillStyle = P.white;
		ctx.fillRect(0, 0, CARD_W, CARD_H);
	}
	label(ctx, 'Paper profile', 32, 28, 16);

	ctx.fillStyle = P.grey;
	ctx.fillRect(32, 66, 170, 170);
	if (photo > 0) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(32, 66, 170, 170);
		ctx.clip();
		ctx.globalAlpha = Math.min(1, photo);
		drawPicto(ctx, p.picto, 42, 86 + (1 - photo) * 40, 150);
		ctx.restore();
	}
	const chars = Math.round(p.name.length * Math.min(1, name));
	text(ctx, p.name.slice(0, chars), 228, 96, { size: 68, weight: 500, family: DISPLAY });
	ctx.save();
	ctx.globalAlpha = Math.min(1, name);
	text(ctx, p.street, 230, 178, { size: 20 });
	ctx.restore();

	label(ctx, 'My story', 32, 272, 16);
	for (let i = 0; i < 3; i++) scribble(ctx, 32, 304 + i * 34, i === 2 ? 250 : 396, Math.min(1, Math.max(0, story * 3 - i)), i * 3 + p.name.length);

	label(ctx, 'Interests', 32, 420, 16);
	p.tokens.forEach((t, i) => {
		const [x, y] = tokenCenter(i);
		const s = tokens ? (tokens[i] ?? 0) : 1;
		if (!hideTokens.includes(i)) token(ctx, t, x, y, s, (i % 2 ? 1 : -1) * 6);
		ctx.save();
		ctx.globalAlpha = Math.min(1, s);
		text(ctx, p.tokenLabels[i], x, y + 46, { size: 15, align: 'center' });
		ctx.restore();
	});
	if (p.written && written > 0) {
		const x = tokenCenter(p.tokens.length)[0] - 38;
		ctx.save();
		ctx.globalAlpha = Math.min(1, written * 2);
		text(ctx, `+ ${p.written}`, x, 464, { size: 22, italic: true });
		ctx.restore();
		scribble(ctx, x, 490, 120, written, 9);
	}

	if (cover > 0.001) {
		const top = 256 + (1 - cover) * 380;
		ctx.save();
		ctx.beginPath();
		ctx.rect(0, top, CARD_W, CARD_H - top);
		ctx.clip();
		ctx.fillStyle = P.black;
		ctx.fillRect(0, top, CARD_W, CARD_H - top);
		const mid = top + (CARD_H - 256) / 2;
		label(ctx, 'Private', CARD_W / 2, mid - 46, 34, P.white, 'center');
		text(ctx, 'Ask at the Blob to see more', CARD_W / 2, mid + 6, { size: 30, color: P.white, align: 'center' });
		ctx.restore();
	}
}

/* ---------- booklet page (400 x 540) ---------- */

export const PAGE_W = 400;
export const PAGE_H = 540;
export const PAGE_K = 0.82;
export const PAGE_PAD = { x: 12, y: 16 } as const;

export const paintPage = (p: ProfileData, hide?: number) => (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, PAGE_W, PAGE_H);
	ctx.save();
	ctx.translate(PAGE_PAD.x, PAGE_PAD.y);
	ctx.scale(PAGE_K, PAGE_K);
	paintProfile(ctx, p, { hideTokens: hide === undefined ? [] : [hide] }, true);
	ctx.restore();
};

/** The two leaf pictograms that sit on the matching tokens (transparent, spread-sized). */
export const paintMatchLeaves = (a: [number, number], b: [number, number]) => (ctx: Ctx) => {
	for (const [x, y] of [a, b]) drawPicto(ctx, 'leaf', x - 19, y - 19, 38);
};

/* ---------- sticker sheet (220 x 380) ---------- */

export const SHEET_W = 220;
export const SHEET_H = 380;
export const SHEET_TOKENS: PictoId[] = ['leaf', 'pot', 'bike', 'wave', 'note', 'tri'];
/** Which sheet slot each of Noor's three tokens comes from. */
export const SHEET_FROM = [0, 2, 4];
export const sheetSlot = (i: number): [number, number] => [60 + (i % 2) * 100, 96 + Math.floor(i / 2) * 106];

export const paintSheet = (taken: number) => (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, SHEET_W, SHEET_H);
	label(ctx, 'Interest tokens', 22, 20, 15);
	SHEET_TOKENS.forEach((id, i) => {
		const [x, y] = sheetSlot(i);
		const k = SHEET_FROM.indexOf(i);
		if (k >= 0 && taken > k) {
			ctx.save();
			ctx.strokeStyle = P.black;
			ctx.lineWidth = 2;
			ctx.setLineDash([6, 6]);
			ctx.beginPath();
			ctx.arc(x, y, TOKEN_R - 1, 0, Math.PI * 2);
			ctx.stroke();
			ctx.restore();
		} else token(ctx, id, x, y);
	});
};

/* ---------- Blackout Communication Kit ---------- */

export const KIT_CARDS: { title: string; picto?: PictoId; token?: boolean }[] = [
	{ title: 'Visual Language Kit', picto: 'tri' },
	{ title: 'Neighbourhood Map', picto: 'ring' },
	{ title: 'Community Cards', picto: 'wave' },
	{ title: 'Paper Profiles', picto: 'person' },
	{ title: 'Interest Tokens', token: true },
	{ title: 'Blob Signage', picto: 'sprout' }
];

/** One kit item as a card, 140 x 196. */
export const paintKitCard = (item: (typeof KIT_CARDS)[number]) => (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, 140, 196);
	if (item.token) token(ctx, 'leaf', 70, 62, 0.95);
	else if (item.picto) drawPicto(ctx, item.picto, 32, 24, 76);
	ctx.font = `700 17px ${SANS}`;
	wrap(ctx, item.title, 120).forEach((line, i) => text(ctx, line, 70, 116 + i * 20, { size: 17, weight: 700, align: 'center' }));
};

/** Front of the kit box, 400 x 140. */
export const paintKitFront = (ctx: Ctx) => {
	ctx.fillStyle = P.black;
	ctx.fillRect(0, 0, 400, 140);
	drawSymbol(ctx, 22, 26, 74, P.white);
	text(ctx, 'Blackout', 116, 28, { size: 27, weight: 700, color: P.white });
	text(ctx, 'Communication Kit', 116, 58, { size: 27, weight: 700, color: P.white });
};

/** Blob Signage on a kiosk, 576 x 300. */
export const paintSign = (local: boolean) => (ctx: Ctx) => {
	ctx.fillStyle = P.green;
	ctx.fillRect(0, 0, 576, 300);
	drawSymbol(ctx, 34, 36, 170, P.black);
	text(ctx, local ? 'Local Blob' : 'Blob', 236, 62, { size: 62, weight: 700 });
	text(ctx, 'Information point', 238, 138, { size: 30 });
};

/* ---------- request slip (250 x 112) ---------- */

export const paintSlip = (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, 250, 112);
	label(ctx, 'Request', 22, 18, 15);
	text(ctx, 'Sam would like to', 22, 46, { size: 21 });
	text(ctx, 'read your profile', 22, 72, { size: 21 });
};

/** A paper copy of a profile, 68 x 88. */
export const paintCopy = (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, 68, 88);
	drawPicto(ctx, 'person2', 4, 28, 60);
};

/* ---------- symbols ---------- */

export const BOARD_W = 800;
export const BOARD_H = 620;
export const BOARD_CELL = 200;
const BOARD_EXAMPLES: PictoId[] = ['tri', 'wave', 'ring', 'cross', 'stairs'];
/** Top-left of board cell i (3 x 2), in board pixels. The last one takes the new symbol. */
export const boardCell = (i: number): [number, number] => [60 + (i % 3) * 240, 96 + Math.floor(i / 3) * 232];

export const paintBoard = (symbol: number) => (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, BOARD_W, BOARD_H);
	label(ctx, 'Public symbol board · Local Blob', 60, 40, 20);
	ctx.strokeStyle = P.black;
	ctx.lineWidth = 2;
	BOARD_EXAMPLES.forEach((id, i) => {
		const [x, y] = boardCell(i);
		ctx.strokeRect(x + 1, y + 1, BOARD_CELL - 2, BOARD_CELL - 2);
		drawPicto(ctx, id, x + 45, y + 45, 110);
	});
	const [x, y] = boardCell(5);
	if (symbol > 0.5) {
		ctx.fillStyle = P.green;
		ctx.fillRect(x, y, BOARD_CELL, BOARD_CELL);
		drawPicto(ctx, 'sprout', x + 40, y + 40, 120);
	} else {
		ctx.save();
		ctx.setLineDash([10, 10]);
		ctx.strokeRect(x + 1, y + 1, BOARD_CELL - 2, BOARD_CELL - 2);
		ctx.restore();
	}
	text(ctx, 'Example symbols, for illustration', 60, 566, { size: 22 });
};

export const FORM_W = 420;
export const FORM_H = 600;
const typed = (s: string, t: number) => s.slice(0, Math.round(s.length * Math.min(1, Math.max(0, t))));

export const paintForm = (draw: number) => (ctx: Ctx) => {
	ctx.fillStyle = P.white;
	ctx.fillRect(0, 0, FORM_W, FORM_H);
	ctx.strokeStyle = P.black;
	ctx.lineWidth = 2;
	ctx.strokeRect(1, 1, FORM_W - 2, FORM_H - 2);
	label(ctx, 'Symbol form', 36, 32, 18);
	ctx.strokeRect(37, 79, 346, 258);
	drawPicto(ctx, 'sprout', 110, 108, 200, Math.min(1, draw * 2));
	label(ctx, 'Meaning', 36, 370, 15);
	text(ctx, typed('Shared vegetable garden', draw * 2.5 - 0.6), 36, 398, { size: 28 });
	label(ctx, 'Use it to mark', 36, 466, 15);
	const s = typed('the garden and its open days', draw * 2.5 - 1.4);
	ctx.font = `400 28px ${SANS}`;
	wrap(ctx, s, 350).forEach((line, i) => text(ctx, line, 36, 494 + i * 34, { size: 28 }));
};

/** A map pin carrying the new symbol, 128 x 128, transparent around the disc. */
export const paintPin = (ctx: Ctx) => {
	ctx.fillStyle = P.green;
	ctx.strokeStyle = P.black;
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.arc(64, 64, 60, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	drawPicto(ctx, 'sprout', 26, 24, 76);
};
