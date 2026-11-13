/**
 * Paper for the diorama: 2D-canvas painters for the printed things. The kit
 * and its contents (box, Practise Blackout Cards, Paper Profile, sticker
 * sheet, Symbol System template, map) are the real prints, painted by
 * `#lib/prints/real.js`; the rest (signage, symbol board, request slip, pins)
 * belongs to the Blob and is drawn here in the ANT palette.
 */
import { CanvasTexture, SRGBColorSpace } from 'three';
import { LOGO_SYMBOL_PATH } from '#lib/brand/logo-paths.js';
import {
	BLACKOUT_CARDS,
	DISPLAY,
	MAP_H,
	MAP_W,
	PAGE_H,
	PAGE_W,
	SANS,
	SHEET_H,
	SHEET_W,
	TEMPLATE_H,
	TEMPLATE_W,
	TOKEN_R,
	circleCenter,
	loadMap,
	loadedMap,
	mm,
	paintCardBoxFront,
	paintMap,
	paintProfileCover,
	paintProfilePages,
	paintStickerSheet,
	paintTemplate,
	pts,
	stickerCenter,
	stickerIndex,
	token,
	SIZE,
	type ProfileAnim,
	type ProfileData,
	type ProfilePage
} from '#lib/prints/real.js';
import { P } from './layout.js';
import { drawPicto, type PictoId, type TokenId } from './pictos.js';

type Ctx = CanvasRenderingContext2D;

export { DISPLAY, SANS, PAGE_H, PAGE_W, SHEET_H, SHEET_W, TOKEN_R, BLACKOUT_CARDS };
export type { ProfileAnim, ProfileData };

/** Waits for the two Adobe Fonts kits (so canvas text uses them) and the map image. */
export async function loadPrintFonts() {
	try {
		await Promise.race([
			Promise.all([
				document.fonts.load('700 40px "helvetica-neue-lt-pro"'),
				document.fonts.load('400 40px "helvetica-neue-lt-pro"'),
				document.fonts.load('italic 400 40px "helvetica-neue-lt-pro"'),
				document.fonts.load('500 40px "evert-pe-vf"'),
				loadMap()
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

/* ---------- people and their Paper Profiles ---------- */

export const NOOR: ProfileData = {
	name: 'Noor',
	street: 'Linden Street, by the bakery',
	picto: 'person2',
	tokens: ['gardening', 'sport', 'music'],
	tokenLabels: ['Gardening', 'Cycling', 'Music'],
	also: 'fixing radios',
	canHelp: 'small repairs',
	useHelp: 'heavy lifting'
};
export const SAM: ProfileData = { name: 'Sam', street: 'Mill Lane', picto: 'person', tokens: ['cooking', 'gardening'], tokenLabels: ['Cooking', 'Gardening'], also: 'baking bread' };
export const ADA: ProfileData = { name: 'Ada', street: 'Canal Row', picto: 'person2', tokens: ['music', 'cooking'], tokenLabels: ['Music', 'Cooking'] };
export const ILYAS: ProfileData = { name: 'Ilyas', street: 'Station Road', picto: 'person', tokens: ['sport'], tokenLabels: ['Cycling'], also: 'chess' };

/** Noor's profile while it's being filled in: cover, story page and interests page side by side. */
export const DESK_PAGES: ProfilePage[] = ['cover', 'story', 'interests'];
/** A profile in the Blob booklet, and on display: cover and interests page. */
export const BOOK_PAGES: ProfilePage[] = ['cover', 'interests'];
export const DESK_W = PAGE_W * DESK_PAGES.length;
export const BOOK_W = PAGE_W * BOOK_PAGES.length;

/** Centre of token i on a row of profile pages, in points. */
export function tokenCenter(i: number, pages: ProfilePage[]): [number, number] {
	const [x, y] = circleCenter(i);
	return [pages.indexOf('interests') * PAGE_W + x, y];
}

export const paintProfile = (pages: ProfilePage[], p: ProfileData, a: ProfileAnim = {}) => (ctx: Ctx) =>
	paintProfilePages(ctx, pages, p, a);

/** A closed profile: just the cover. */
export const paintCover = (p: ProfileData) => (ctx: Ctx) => paintProfileCover(ctx, p);

/** The two gardening pictograms that sit on the matching tokens (transparent, booklet-spread-sized). */
export const paintMatchLeaves = (a: [number, number], b: [number, number]) => (ctx: Ctx) => {
	const s = (TOKEN_R * 2 * 46) / 76;
	for (const [x, y] of [a, b]) drawPicto(ctx, 'gardening', x - s / 2, y - s / 2, s);
};

/* ---------- Interest Token sticker sheet ---------- */

/** Which sticker each of Noor's tokens comes from. */
export const SHEET_FROM = NOOR.tokens.map((t) => stickerIndex(t as TokenId));
export const sheetSlot = stickerCenter;
export const paintSheet = (taken: number) => (ctx: Ctx) => paintStickerSheet(ctx, SHEET_FROM.slice(0, taken));

/** A loose token on a transparent 96 x 96 canvas (for tokens in flight). */
export const TOKEN_CANVAS = 96;
export const paintToken = (id: PictoId) => (ctx: Ctx) => token(ctx, id, 48, 48, 47);

/* ---------- Blackout Communication Kit: what comes out of the box ---------- */

export type KitPrint = { title: string; w: number; h: number; paint: (ctx: Ctx) => void };

/** The five things in the kit, as they rise out of the box (sizes in points, true to scale). */
export const KIT_PRINTS: KitPrint[] = [
	{ title: 'Neighbourhood map', w: MAP_W, h: MAP_H, paint: (ctx) => paintMap(ctx, loadedMap()) },
	{ title: 'Paper Profile', w: PAGE_W, h: PAGE_H, paint: (ctx) => paintProfileCover(ctx, null) },
	{ title: 'Interest tokens', w: SHEET_W, h: SHEET_H, paint: (ctx) => paintStickerSheet(ctx) },
	{ title: 'Symbol System template', w: TEMPLATE_W, h: TEMPLATE_H, paint: (ctx) => paintTemplate(ctx) },
	{ title: 'Practise Blackout Cards', w: mm(SIZE.cardBox.w), h: mm(SIZE.cardBox.h), paint: paintCardBoxFront }
];

/** Sizes of the kit box in points (w x d x h), for the 3D box. */
export const KIT_BOX = { w: mm(SIZE.kit.w), d: mm(SIZE.kit.d), h: mm(SIZE.kit.h) };
export const KIT_LID = pts({ w: SIZE.kit.w, h: SIZE.kit.d });
export const KIT_WALL = pts({ w: SIZE.kit.w, h: SIZE.kit.h });
export { paintKitBack, paintKitFront, paintKitLid } from '#lib/prints/real.js';

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

/** A paper copy of a profile: its cover. */
export const COPY_W = PAGE_W;
export const COPY_H = PAGE_H;
export const paintCopy = paintCover(NOOR);

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
	text(ctx, 'Add yours with a Symbol System template', 60, 566, { size: 22 });
};

/** The Symbol System template, being filled in. */
export const FORM_W = TEMPLATE_W;
export const FORM_H = TEMPLATE_H;

export const paintForm = (draw: number) => (ctx: Ctx) =>
	paintTemplate(ctx, {
		symbol: 'sprout',
		draw: Math.min(1, draw * 2),
		meaning: 'Shared vegetable garden',
		mark: 'the garden and its open days',
		write: draw
	});

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
