/**
 * Procedural print textures for the Blackout Communication Kit concept model.
 * Everything here is a CONCEPT mock-up drawn in the ANT palette. The only supplied
 * artwork used is the ANT logo, painted from its original SVG path data.
 */
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { LOGO_SYMBOL_PATH, LOGO_WORDMARK_PATHS } from '#lib/brand/logo-paths.js';

const BLACK = '#000000';
const GREY = '#dddddd';
const WHITE = '#ffffff';
const GREEN = '#c5d92f';
const FONT = '"helvetica-neue-lt-pro", "Helvetica Neue", Helvetica, Arial, sans-serif';

type Ctx = CanvasRenderingContext2D;

function make(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, anisotropy = 4): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	draw(ctx, w, h);
	const tex = new CanvasTexture(canvas);
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = anisotropy;
	return tex;
}

const font = (size: number, weight: 400 | 700 = 700) => `${weight} ${size}px ${FONT}`;

/** Paints the supplied logo. `part` picks the full lock-up or the symbol only. */
function drawLogo(ctx: Ctx, x: number, y: number, height: number, color: string, part: 'full' | 'symbol' = 'full') {
	const s = height / 300;
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(s, s);
	if (part === 'symbol') ctx.translate(-15, 0);
	ctx.fillStyle = color;
	ctx.fill(new Path2D(LOGO_SYMBOL_PATH), 'evenodd');
	if (part === 'full') for (const d of LOGO_WORDMARK_PATHS) ctx.fill(new Path2D(d));
	ctx.restore();
}
/** Width of the logo at a given height. */
const logoWidth = (height: number, part: 'full' | 'symbol' = 'full') => (part === 'full' ? 900.4 : 300) * (height / 300);

function text(ctx: Ctx, str: string, x: number, y: number, size: number, color: string, weight: 400 | 700 = 700, align: CanvasTextAlign = 'left') {
	ctx.font = font(size, weight);
	ctx.fillStyle = color;
	ctx.textAlign = align;
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(str, x, y);
}

function concept(ctx: Ctx, str: string, x: number, y: number, color: string, size = 16, align: CanvasTextAlign = 'left') {
	text(ctx, str.toUpperCase(), x, y, size, color, 700, align);
}

/* ---------- Box ---------- */

const lidTop = () =>
	make(1024, 712, (ctx, w, h) => {
		ctx.fillStyle = BLACK;
		ctx.fillRect(0, 0, w, h);
		drawLogo(ctx, 64, 64, 150, WHITE);
		text(ctx, 'Blackout', 64, 430, 92, WHITE);
		text(ctx, 'Communication Kit', 64, 525, 92, WHITE);
		ctx.fillStyle = GREEN;
		ctx.fillRect(0, h - 110, w, 110);
		text(ctx, 'Adaptive Network of Trust', 64, h - 42, 36, BLACK);
		concept(ctx, 'Concept packaging', w - 64, h - 44, BLACK, 22, 'right');
	});

const lidInside = () =>
	make(1024, 712, (ctx, w, h) => {
		ctx.fillStyle = GREY;
		ctx.fillRect(0, 0, w, h);
		text(ctx, 'Inside this kit', 70, 120, 56, BLACK);
		const items = [
			'Visual Language Kit',
			'Neighbourhood Map',
			'Community Cards',
			'Paper Profiles',
			'Interest Tokens',
			'Blob Signage'
		];
		items.forEach((label, i) => {
			const y = 210 + i * 70;
			ctx.fillStyle = BLACK;
			ctx.fillRect(70, y - 34, 40, 40);
			text(ctx, String(i + 1), 90, y - 4, 28, GREEN, 700, 'center');
			text(ctx, label, 132, y, 38, BLACK, 400);
		});
		drawLogo(ctx, w - 70 - logoWidth(70, 'symbol'), 70, 70, BLACK, 'symbol');
		concept(ctx, 'Concept print', w - 70, h - 50, BLACK, 20, 'right');
	});

const lidFront = () =>
	make(1024, 104, (ctx, w, h) => {
		ctx.fillStyle = GREEN;
		ctx.fillRect(0, 0, w, h);
		text(ctx, 'BLACKOUT COMMUNICATION KIT', 40, h / 2 + 14, 38, BLACK);
		drawLogo(ctx, w - 40 - logoWidth(64), (h - 64) / 2, 64, BLACK);
	});

const boxFront = () =>
	make(1024, 256, (ctx, w, h) => {
		ctx.fillStyle = BLACK;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = GREEN;
		ctx.fillRect(0, h - 18, w, 6);
		text(ctx, 'Prepare together, before you need to.', 40, h - 44, 30, WHITE, 400);
		drawLogo(ctx, w - 40 - logoWidth(54, 'symbol'), h - 104, 54, WHITE, 'symbol');
	});

/* ---------- Contents ---------- */

/** Visual Language Kit sheet: illustrative geometric shapes, not the final pictograms. */
const pictogramSheet = () =>
	make(512, 576, (ctx, w, h) => {
		ctx.fillStyle = WHITE;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = BLACK;
		ctx.fillRect(0, 0, w, 72);
		text(ctx, 'Visual Language Kit', 28, 47, 30, WHITE);
		const cell = 108;
		const ox = (w - cell * 4) / 2;
		const oy = 104;
		for (let r = 0; r < 4; r++)
			for (let c = 0; c < 4; c++) {
				const x = ox + c * cell + cell / 2;
				const y = oy + r * cell + cell / 2;
				const k = (r * 4 + c) % 6;
				ctx.fillStyle = (r + c) % 3 === 0 ? GREEN : WHITE;
				ctx.fillRect(x - 46, y - 46, 92, 92);
				ctx.strokeStyle = BLACK;
				ctx.lineWidth = 3;
				ctx.strokeRect(x - 46, y - 46, 92, 92);
				ctx.fillStyle = BLACK;
				ctx.beginPath();
				if (k === 0) ctx.arc(x, y, 24, 0, Math.PI * 2);
				else if (k === 1) (ctx.moveTo(x, y - 26), ctx.lineTo(x + 26, y + 22), ctx.lineTo(x - 26, y + 22));
				else if (k === 2) ctx.rect(x - 22, y - 22, 44, 44);
				else if (k === 3) (ctx.moveTo(x - 26, y - 10), ctx.lineTo(x + 6, y - 10), ctx.lineTo(x + 6, y - 24), ctx.lineTo(x + 28, y), ctx.lineTo(x + 6, y + 24), ctx.lineTo(x + 6, y + 10), ctx.lineTo(x - 26, y + 10));
				else if (k === 4) (ctx.arc(x - 12, y, 12, 0, Math.PI * 2), ctx.arc(x + 14, y, 12, 0, Math.PI * 2));
				else (ctx.moveTo(x, y - 26), ctx.lineTo(x + 26, y), ctx.lineTo(x, y + 26), ctx.lineTo(x - 26, y));
				ctx.fill();
			}
		concept(ctx, 'Illustrative shapes, not final symbols', 28, h - 20, BLACK, 15);
	});

/** Neighbourhood Map cover: abstract streets and example points. */
const mapCover = () =>
	make(448, 576, (ctx, w, h) => {
		ctx.fillStyle = GREY;
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = WHITE;
		ctx.lineCap = 'round';
		const streets: [number, number, number, number, number][] = [
			[0, 210, w, 180, 18],
			[0, 400, w, 430, 14],
			[120, 120, 150, h, 16],
			[320, 120, 290, h, 12],
			[0, 300, 140, 260, 10],
			[300, 300, w, 330, 10]
		];
		for (const [x1, y1, x2, y2, lw] of streets) {
			ctx.lineWidth = lw;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
		}
		// route between two example points
		ctx.strokeStyle = BLACK;
		ctx.lineWidth = 5;
		ctx.setLineDash([12, 10]);
		ctx.beginPath();
		ctx.moveTo(140, 200);
		ctx.lineTo(300, 320);
		ctx.lineTo(300, 430);
		ctx.stroke();
		ctx.setLineDash([]);
		for (const [x, y, blob] of [
			[140, 200, true],
			[300, 430, false],
			[60, 420, false]
		] as const) {
			ctx.fillStyle = blob ? GREEN : WHITE;
			ctx.strokeStyle = BLACK;
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.arc(x, y, 20, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		}
		ctx.fillStyle = BLACK;
		ctx.fillRect(0, 0, w, 104);
		text(ctx, 'Neighbourhood', 26, 46, 32, WHITE);
		text(ctx, 'Map', 26, 84, 32, GREEN);
		drawLogo(ctx, w - 26 - logoWidth(52, 'symbol'), 26, 52, WHITE, 'symbol');
		concept(ctx, 'Example layout', 26, h - 22, BLACK, 16);
	});

const signage = () =>
	make(576, 408, (ctx, w, h) => {
		ctx.fillStyle = GREEN;
		ctx.fillRect(0, 0, w, h);
		drawLogo(ctx, 36, 50, 150, BLACK, 'symbol');
		text(ctx, 'Local', 220, 110, 50, BLACK);
		text(ctx, 'Blob', 220, 164, 50, BLACK);
		text(ctx, 'Information point', 220, 210, 26, BLACK, 400);
		ctx.strokeStyle = BLACK;
		ctx.setLineDash([10, 10]);
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(0, h * 0.68);
		ctx.lineTo(w, h * 0.68);
		ctx.stroke();
		ctx.setLineDash([]);
		concept(ctx, 'Example sign', 36, h - 34, BLACK, 18);
	});

const cardBack = () =>
	make(360, 512, (ctx, w, h) => {
		ctx.fillStyle = GREEN;
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = BLACK;
		ctx.lineWidth = 6;
		ctx.strokeRect(18, 18, w - 36, h - 36);
		drawLogo(ctx, (w - logoWidth(170, 'symbol')) / 2, 110, 170, BLACK, 'symbol');
		text(ctx, 'Community', w / 2, 370, 40, BLACK, 700, 'center');
		text(ctx, 'Cards', w / 2, 414, 40, BLACK, 700, 'center');
	});

const cardEdge = () =>
	make(256, 64, (ctx, w, h) => {
		ctx.fillStyle = WHITE;
		ctx.fillRect(0, 0, w, h);
		ctx.strokeStyle = GREY;
		ctx.lineWidth = 1;
		for (let y = 1; y < h; y += 3) {
			ctx.beginPath();
			ctx.moveTo(0, y + 0.5);
			ctx.lineTo(w, y + 0.5);
			ctx.stroke();
		}
	});

const profileCard = () =>
	make(432, 600, (ctx, w, h) => {
		ctx.fillStyle = WHITE;
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = BLACK;
		ctx.fillRect(0, 0, w, 70);
		text(ctx, 'Paper Profile', 26, 46, 30, WHITE);
		drawLogo(ctx, w - 26 - logoWidth(40, 'symbol'), 15, 40, WHITE, 'symbol');
		// portrait frame
		ctx.fillStyle = GREY;
		ctx.fillRect(26, 96, 140, 160);
		ctx.strokeStyle = BLACK;
		ctx.lineWidth = 4;
		ctx.strokeRect(26, 96, 140, 160);
		ctx.fillStyle = BLACK;
		ctx.beginPath();
		ctx.arc(96, 160, 28, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(96, 256, 50, Math.PI, 0);
		ctx.fill();
		text(ctx, 'Name', 190, 122, 22, BLACK);
		text(ctx, 'Street', 190, 196, 22, BLACK);
		ctx.fillRect(190, 140, 210, 3);
		ctx.fillRect(190, 214, 210, 3);
		text(ctx, 'Interests', 26, 304, 22, BLACK);
		for (let i = 0; i < 5; i++) {
			ctx.beginPath();
			ctx.arc(46 + i * 56, 344, 20, 0, Math.PI * 2);
			ctx.fillStyle = i < 2 ? GREEN : WHITE;
			ctx.fill();
			ctx.strokeStyle = BLACK;
			ctx.lineWidth = 3;
			ctx.stroke();
		}
		text(ctx, 'My story / message', 26, 404, 22, BLACK);
		ctx.fillStyle = GREY;
		for (let i = 0; i < 5; i++) ctx.fillRect(26, 424 + i * 26, w - 52, 3);
		concept(ctx, 'Concept layout', 26, h - 18, BLACK, 15);
	});

const stickerSheet = () =>
	make(256, 500, (ctx, w, h) => {
		ctx.fillStyle = WHITE;
		ctx.fillRect(0, 0, w, h);
		for (let r = 0; r < 6; r++)
			for (let c = 0; c < 3; c++) {
				const x = 46 + c * 82;
				const y = 50 + r * 72;
				ctx.beginPath();
				ctx.arc(x, y, 28, 0, Math.PI * 2);
				ctx.fillStyle = (r + c) % 2 ? BLACK : GREEN;
				ctx.fill();
				ctx.strokeStyle = BLACK;
				ctx.lineWidth = 3;
				ctx.stroke();
				ctx.fillStyle = (r + c) % 2 ? GREEN : BLACK;
				ctx.beginPath();
				if ((r * 3 + c) % 3 === 0) ctx.arc(x, y, 9, 0, Math.PI * 2);
				else if ((r * 3 + c) % 3 === 1) ctx.rect(x - 9, y - 9, 18, 18);
				else (ctx.moveTo(x, y - 11), ctx.lineTo(x + 11, y + 9), ctx.lineTo(x - 11, y + 9));
				ctx.fill();
			}
		concept(ctx, 'Example stickers', 20, h - 20, BLACK, 15);
	});

const tokenFace = () =>
	make(128, 128, (ctx, w, h) => {
		ctx.fillStyle = GREEN;
		ctx.fillRect(0, 0, w, h);
		drawLogo(ctx, (w - logoWidth(70, 'symbol')) / 2, (h - 70) / 2, 70, BLACK, 'symbol');
	});

export type KitTextures = {
	lidTop: Texture;
	lidInside: Texture;
	lidFront: Texture;
	boxFront: Texture;
	pictogramSheet: Texture;
	mapCover: Texture;
	signage: Texture;
	cardBack: Texture;
	cardEdge: Texture;
	profileCard: Texture;
	stickerSheet: Texture;
	tokenFace: Texture;
};

/** Waits for the Helvetica Neue web font (if available) so printed text uses it. */
export async function createKitTextures(): Promise<KitTextures> {
	try {
		await Promise.race([
			Promise.all([
				document.fonts.load(`700 40px "helvetica-neue-lt-pro"`),
				document.fonts.load(`400 40px "helvetica-neue-lt-pro"`)
			]),
			new Promise((r) => setTimeout(r, 2500))
		]);
	} catch {
		/* fall back to system Helvetica/Arial */
	}
	return {
		lidTop: lidTop(),
		lidInside: lidInside(),
		lidFront: lidFront(),
		boxFront: boxFront(),
		pictogramSheet: pictogramSheet(),
		mapCover: mapCover(),
		signage: signage(),
		cardBack: cardBack(),
		cardEdge: cardEdge(),
		profileCard: profileCard(),
		stickerSheet: stickerSheet(),
		tokenFace: tokenFace()
	};
}

export function disposeKitTextures(t: KitTextures | null) {
	if (!t) return;
	for (const tex of Object.values(t)) tex.dispose();
}
