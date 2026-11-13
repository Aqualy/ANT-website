/**
 * Print textures for the Blackout Communication Kit 3D model: the real box
 * and the real prints inside it, painted by `#lib/prints/real.js`.
 */
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import {
	PAGE_H,
	PAGE_W,
	SHEET_H,
	SHEET_W,
	TEMPLATE_H,
	TEMPLATE_W,
	CLUB_EXAMPLE,
	MAP_H,
	MAP_W,
	SIZE,
	loadMap,
	mm,
	paintCard,
	paintCardBack,
	paintCardBoxBack,
	paintCardBoxFront,
	paintKitBack,
	paintKitFront,
	paintKitLid,
	paintMap,
	paintProfileBack,
	paintProfileCover,
	paintStickerSheet,
	paintTemplate
} from '#lib/prints/real.js';

type Ctx = CanvasRenderingContext2D;

/** A texture `w` x `h` points, painted at `scale` pixels per point. */
function make(w: number, h: number, scale: number, draw: (ctx: Ctx) => void): CanvasTexture {
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(w * scale);
	canvas.height = Math.round(h * scale);
	const ctx = canvas.getContext('2d')!;
	ctx.scale(scale, scale);
	draw(ctx);
	return texture(canvas);
}

/**
 * The same, turned half a turn: a box's underside (-y face) shows its texture
 * upside down, so prints seen from below are painted rotated.
 */
function makeFlipped(w: number, h: number, scale: number, draw: (ctx: Ctx) => void): CanvasTexture {
	return make(w, h, scale, (ctx) => {
		ctx.translate(w, h);
		ctx.rotate(Math.PI);
		draw(ctx);
	});
}

function texture(canvas: HTMLCanvasElement) {
	const tex = new CanvasTexture(canvas);
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
}

export type KitTextures = {
	lidTop: Texture;
	boxFront: Texture;
	boxBack: Texture;
	cardBoxFront: Texture;
	cardBoxBack: Texture;
	cardFront: Texture;
	/** The face of the card lying face down. */
	cardFront2: Texture;
	cardBack: Texture;
	profileCover: Texture;
	profileBack: Texture;
	stickerSheet: Texture;
	template: Texture;
	map: Texture;
};

/** Waits for the web fonts and the map image, so printed text uses the site's fonts. */
export async function createKitTextures(): Promise<KitTextures> {
	let map: HTMLImageElement | null = null;
	try {
		const [, img] = await Promise.race([
			Promise.all([
				Promise.all([
					document.fonts.load(`700 40px "helvetica-neue-lt-pro"`),
					document.fonts.load(`400 40px "helvetica-neue-lt-pro"`),
					document.fonts.load(`italic 400 40px "helvetica-neue-lt-pro"`),
					document.fonts.load(`500 40px "evert-pe-vf"`)
				]),
				loadMap()
			]),
			new Promise<[unknown, null]>((r) => setTimeout(() => r([null, null]), 3000))
		]);
		map = img;
	} catch {
		/* fall back to system Helvetica/Arial */
	}
	const kitW = mm(SIZE.kit.w);
	const kitH = mm(SIZE.kit.h);
	const cbW = mm(SIZE.cardBox.w);
	const cbH = mm(SIZE.cardBox.h);
	const cW = mm(SIZE.card.w);
	const cH = mm(SIZE.card.h);
	return {
		lidTop: make(kitW, mm(SIZE.kit.d), 1.7, paintKitLid),
		boxFront: make(kitW, kitH, 1.7, paintKitFront),
		boxBack: make(kitW, kitH, 1.7, paintKitBack),
		cardBoxFront: make(cbW, cbH, 3.6, paintCardBoxFront),
		cardBoxBack: makeFlipped(cbW, cbH, 3.6, paintCardBoxBack),
		cardFront: make(cW, cH, 3.6, (ctx) => paintCard(ctx, 0)),
		cardFront2: make(cW, cH, 3.6, (ctx) => paintCard(ctx, 1)),
		cardBack: make(cW, cH, 2, paintCardBack),
		profileCover: make(PAGE_W, PAGE_H, 1.8, (ctx) => paintProfileCover(ctx, null)),
		profileBack: makeFlipped(PAGE_W, PAGE_H, 0.8, paintProfileBack),
		stickerSheet: make(SHEET_W, SHEET_H, 1.9, (ctx) => paintStickerSheet(ctx)),
		template: make(TEMPLATE_W, TEMPLATE_H, 2.4, (ctx) => paintTemplate(ctx, CLUB_EXAMPLE)),
		map: make(MAP_W, MAP_H, 1.2, (ctx) => paintMap(ctx, map))
	};
}

export function disposeKitTextures(t: KitTextures | null) {
	if (!t) return;
	for (const tex of Object.values(t)) tex.dispose();
}
