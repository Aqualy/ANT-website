/**
 * The ANT neighbourhood as one low-poly paper diorama, built in code.
 *
 *   const world = createWorld(renderer);   // the WebGLRenderer the world is drawn with
 *   scene.add(world.group);
 *   world.apply(state);            // pose everything for a WorldState
 *   world.billboards               // turn these toward the camera
 *   world.anchors.noor             // named points, for labels or gameplay
 *   world.dispose();
 *
 * The world knows nothing about chapters or cameras. Call `loadPrintFonts()`
 * first so the printed textures use the site's fonts.
 */
import {
	AmbientLight,
	BoxGeometry,
	CircleGeometry,
	CylinderGeometry,
	DirectionalLight,
	ExtrudeGeometry,
	Group,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	Object3D,
	PlaneGeometry,
	Raycaster,
	ShadowMaterial,
	Shape,
	SphereGeometry,
	Vector3,
	type BufferGeometry,
	type Material,
	type Texture,
	type WebGLRenderer
} from 'three';
import { CHAIN_PARAMS, chain, chainPoint, createBlobHost, type SurfaceBlob } from './blobHost.js';
import {
	BOARD_AT,
	BOOKLET_AT,
	COUNTER_AT,
	DESK_AT,
	GROUND,
	HOUSES,
	KIT_AT,
	LINKS,
	LOCAL_BLOB,
	NOOR_AT_BLOB,
	NOOR_HOME,
	OPERATORS,
	OTHER_BLOBS,
	P,
	PINS,
	PRIV_CARD_AT,
	SAM_AT_BLOB,
	SAM_HOME,
	STREETS,
	type XZ
} from './layout.js';
import {
	ADA,
	BOARD_CELL,
	BOARD_H,
	BOARD_W,
	BOOK_PAGES,
	BOOK_W,
	COPY_H,
	COPY_W,
	DESK_PAGES,
	DESK_W,
	FORM_H,
	FORM_W,
	ILYAS,
	KIT_BOX,
	KIT_LID,
	KIT_PRINTS,
	KIT_WALL,
	NOOR,
	PAGE_H,
	PAGE_W,
	SAM,
	SHEET_FROM,
	SHEET_H,
	SHEET_W,
	TOKEN_CANVAS,
	TOKEN_R,
	boardCell,
	paintBoard,
	paintCopy,
	paintCover,
	paintForm,
	paintKitBack,
	paintKitFront,
	paintKitLid,
	paintMatchLeaves,
	paintPin,
	paintProfile,
	paintSheet,
	paintSign,
	paintSlip,
	paintToken,
	print,
	sheetSlot,
	tokenCenter
} from './prints.js';
import type { WorldState } from './state.js';

export type AnchorId =
	| 'localBlob'
	| 'op1'
	| 'op2'
	| 'noor'
	| 'sam'
	| 'kit'
	| 'booklet'
	| 'bookletFoot'
	| 'board'
	| 'counter'
	| 'choice'
	| 'privCard'
	| 'pinA'
	| 'pinB'
	| 'otherA'
	| 'otherB'
	| 'otherC';

/** Prints a camera can move in on to read them. */
export type SubjectId =
	| 'kitMap'
	| 'kitProfile'
	| 'kitTokens'
	| 'kitSymbols'
	| 'kitCards'
	| 'sheet'
	| 'cover'
	| 'story'
	| 'interests'
	| 'bookLeft'
	| 'bookRight'
	| 'priv'
	| 'board';

/**
 * A print to look at closely: the object it's on, its centre in that object's
 * plane, and its size there. Facing the viewer unless `az`/`el` give the
 * direction to look from (degrees, as in a chapter's shot).
 */
export type Subject = { obj: Object3D; at?: [number, number]; w: number; h: number; az?: number; el?: number };

export type World = {
	group: Group;
	anchors: Record<AnchorId, Vector3>;
	/** Flat paper that should face the viewer: copy the camera's quaternion onto these. */
	billboards: Object3D[];
	subjects: Record<SubjectId, Subject>;
	/** Centre (world space) and scaled size of a subject, or null while it isn't showing. */
	locate(id: SubjectId, out: Vector3): { w: number; h: number } | null;
	/** The subject under a ray, if any. */
	pick(ray: Raycaster): SubjectId | null;
	apply(state: WorldState): void;
	dispose(): void;
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x: number) => {
	const t = clamp01(x);
	return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const FLAT = -Math.PI / 2;

export function createWorld(renderer: WebGLRenderer): World {
	const group = new Group();
	const bin: { dispose(): void }[] = [];
	const keep = <T extends { dispose(): void }>(o: T) => (bin.push(o), o);
	const billboards: Object3D[] = [];

	/* ---------- materials: palette values only ---------- */
	const lit = (color: string) => keep(new MeshLambertMaterial({ color, flatShading: true }));
	const flat = (color: string) => keep(new MeshBasicMaterial({ color }));
	const paper = (map: Texture, transparent = false) => keep(new MeshBasicMaterial({ map, transparent, depthWrite: !transparent }));
	const M = { white: lit(P.white), grey: lit(P.grey), black: lit(P.black), green: lit(P.green), inkFlat: flat(P.black), greenFlat: flat(P.green), whiteFlat: flat(P.white) };

	const box = (w: number, h: number, d: number) => keep(new BoxGeometry(w, h, d));
	const plane = (w: number, h: number) => keep(new PlaneGeometry(w, h));
	const add = (parent: Object3D, geometry: BufferGeometry, material: Material | Material[], x = 0, y = 0, z = 0, shadow = false) => {
		const m = new Mesh(geometry, material);
		m.position.set(x, y, z);
		m.castShadow = shadow;
		// Blended paper is drawn after the ground's shadow layer, or the shadow would show through it.
		if (!Array.isArray(material) && material.transparent) m.renderOrder = 5;
		parent.add(m);
		return m;
	};
	/** A group that always faces the camera. */
	const billboard = (parent: Object3D = group) => {
		const g = new Group();
		parent.add(g);
		billboards.push(g);
		return g;
	};
	/** Box materials with a print on the south (+z) face. */
	const fronted = (base: Material, front: Material) => [base, base, base, base, front, base];
	const show = (o: Object3D, s: number) => {
		o.visible = s > 0.01;
		if (o.visible) o.scale.setScalar(s);
	};
	/** Pop-up paper: stands at `v` = 1, lies flat (and is gone) at 0. `size` is its own scale. */
	const fold = (o: Object3D, v: number, size: number) => {
		o.visible = v > 0.01;
		if (o.visible) o.scale.set(size, size * v, size);
	};

	/* ---------- light: white only, so shading stays within the palette ---------- */
	group.add(new AmbientLight('#ffffff', 2.0));
	const sun = new DirectionalLight('#ffffff', 1.7);
	sun.position.set(-14, 26, 16);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
	sun.shadow.camera.updateProjectionMatrix();
	sun.shadow.bias = -0.0005;
	sun.shadow.normalBias = 0.04;
	// The shadow map is only redrawn when something that casts a shadow has moved (see apply).
	sun.shadow.autoUpdate = false;
	let shadowKey = '';
	group.add(sun, sun.target);
	bin.push({ dispose: () => sun.shadow.map?.dispose() });

	/* ---------- ground ---------- */
	const host = createBlobHost(renderer);
	bin.push(host);
	const { ppu } = GROUND;
	const ground = host.surface(GROUND.w * ppu, GROUND.h * ppu, { reach: 3, maxBridges: 6, organic: 0.6 }, true);

	const greenDisc = add(group, keep(new CircleGeometry(1, 72)), M.greenFlat, LOCAL_BLOB[0], 0.004, LOCAL_BLOB[1]);
	greenDisc.rotation.x = FLAT;

	// Each street with its dashed centre line (so it reads as a street even when only a strip of it is in view).
	// A street lies down by narrowing to nothing.
	const DASH = 1.5;
	const dashGeo = plane(0.5, 0.05).rotateX(FLAT);
	const mat = new Matrix4();
	const streets = STREETS.map((s, i) => {
		const alongX = s.a[1] === s.b[1];
		const len = alongX ? s.b[0] - s.a[0] : s.b[1] - s.a[1];
		const strip = add(group, alongX ? plane(len, s.w) : plane(s.w, len), M.whiteFlat, (s.a[0] + s.b[0]) / 2, 0.012, (s.a[1] + s.b[1]) / 2);
		strip.rotation.x = FLAT;
		const from = alongX ? s.a[0] : s.a[1];
		const n = Math.floor(len / DASH);
		const dashes = new InstancedMesh(dashGeo, M.inkFlat, n);
		for (let k = 0; k < n; k++) {
			const d = from + DASH / 2 + k * DASH;
			mat.makeRotationY(alongX ? 0 : Math.PI / 2).setPosition(alongX ? d : s.a[0], 0.016, alongX ? s.a[1] : d);
			dashes.setMatrixAt(k, mat);
		}
		group.add(dashes);
		bin.push(dashes);
		// The two streets the new symbol is used on stand with the east side.
		return { strip, dashes, alongX, east: i === 1 || i === 3 };
	});

	const blobPlane = add(group, plane(GROUND.w, GROUND.h), ground.material, GROUND.x0 + GROUND.w / 2, 0.02, GROUND.z0 + GROUND.h / 2);
	blobPlane.rotation.x = FLAT;
	blobPlane.renderOrder = 1;

	const shadowPlane = add(group, plane(160, 160), keep(new ShadowMaterial({ opacity: 0.16 })), 0, 0.03, 0);
	shadowPlane.rotation.x = FLAT;
	shadowPlane.receiveShadow = true;
	shadowPlane.renderOrder = 2;

	/* ---------- houses ---------- */
	const houseBody = box(3.2, 1.9, 2.6).translate(0, 0.95, 0);
	const roofShape = new Shape();
	roofShape.moveTo(-1.8, 0);
	roofShape.lineTo(1.8, 0);
	roofShape.lineTo(0, 1.25);
	roofShape.closePath();
	const houseRoof = keep(new ExtrudeGeometry(roofShape, { depth: 2.9, bevelEnabled: false })).translate(0, 1.9, -1.45);
	const door = plane(0.56, 1.0);
	const windowPane = plane(0.62, 0.62);
	const houses = HOUSES.map((h, i) => {
		const g = new Group();
		g.position.set(h.at[0], 0, h.at[1]);
		g.rotation.y = (h.turn * Math.PI) / 2;
		g.scale.setScalar(h.s);
		add(g, houseBody, M.white, 0, 0, 0, true);
		add(g, houseRoof, M.white, 0, 0, 0, true);
		add(g, door, M.inkFlat, 0.6, 0.5, 1.302);
		add(g, windowPane, M.inkFlat, -0.7, 1.05, 1.302);
		group.add(g);
		return { g, s: h.s, home: i === 0, east: h.at[0] > 5 && h.at[0] < 15 && h.at[1] < 0 && h.at[1] > -6 };
	});

	/* ---------- Blob kiosks, with Blob Signage ---------- */
	const kioskGeo = {
		base: box(3.2, 2.0, 2.0),
		recess: plane(2.4, 0.85),
		shelf: box(2.7, 0.1, 0.5),
		roof: box(3.7, 0.16, 2.6),
		post: box(0.1, 1.0, 0.1),
		sign: box(2.7, 1.41, 0.08)
	};
	const signLocal = keep(print(576, 300, 2, paintSign(true)).texture);
	const signOther = keep(print(576, 300, 1, paintSign(false)).texture);
	const kiosk = (at: XZ, scale: number, sign: Texture) => {
		const g = new Group();
		g.position.set(at[0], 0, at[1]);
		g.scale.setScalar(scale);
		add(g, kioskGeo.base, M.white, 0, 1, 0, true);
		add(g, kioskGeo.recess, M.inkFlat, 0, 1.32, 1.002);
		add(g, kioskGeo.shelf, M.white, 0, 0.85, 1.15, true);
		add(g, kioskGeo.roof, M.white, 0, 2.08, 0, true);
		add(g, kioskGeo.post, M.black, -1.1, 2.6, 0.6);
		add(g, kioskGeo.post, M.black, 1.1, 2.6, 0.6);
		add(g, kioskGeo.sign, fronted(M.green, paper(sign)), 0, 3.4, 0.6, true);
		group.add(g);
		return g;
	};
	const localKiosk = kiosk(LOCAL_BLOB, 1, signLocal);
	const otherKiosks = OTHER_BLOBS.map((o) => kiosk(o.at, 0.78, signOther));

	/* ---------- characters: paper pawns ---------- */
	const pawnGeo = {
		body: keep(new CylinderGeometry(0.11, 0.4, 1.0, 10)),
		head: keep(new SphereGeometry(0.25, 10, 8)),
		band: keep(new CylinderGeometry(0.3, 0.345, 0.2, 10))
	};
	const pawn = (body: Material, head: Material, band?: Material) => {
		const g = new Group();
		add(g, pawnGeo.body, body, 0, 0.5, 0, true);
		add(g, pawnGeo.head, head, 0, 1.2, 0, true);
		if (band) add(g, pawnGeo.band, band, 0, 0.36, 0);
		group.add(g);
		return g;
	};
	const noor = pawn(M.black, M.black);
	const sam = pawn(M.white, M.black);
	const operators = OPERATORS.map((at) => {
		const g = pawn(M.black, M.black, M.green);
		g.position.set(at[0], 0, at[1]);
		return g;
	});

	/* ---------- Blackout Communication Kit: the real box (white, green front), 240 x 220 x 55 mm ---------- */
	const KB = { w: 2.0, d: (2.0 * KIT_BOX.d) / KIT_BOX.w, h: (2.0 * KIT_BOX.h) / KIT_BOX.w };
	const kit = new Group();
	kit.position.set(KIT_AT[0], 0, KIT_AT[1]);
	group.add(kit);
	const kitFront = paper(keep(print(KIT_WALL[0], KIT_WALL[1], 1.2, paintKitFront).texture));
	const kitBack = paper(keep(print(KIT_WALL[0], KIT_WALL[1], 1.2, paintKitBack).texture));
	// The top of the base is the inside of the box, seen once the lid is up.
	add(kit, box(KB.w, KB.h, KB.d), [M.white, M.white, M.grey, M.white, kitFront, kitBack], 0, KB.h / 2, 0, true);
	const lid = new Group();
	lid.position.set(0, KB.h, -KB.d / 2);
	kit.add(lid);
	const lidTop = paper(keep(print(KIT_LID[0], KIT_LID[1], 1.2, paintKitLid).texture));
	add(lid, box(KB.w + 0.02, 0.025, KB.d + 0.02), [M.white, M.white, lidTop, M.grey, M.white, M.white], 0, 0.0125, KB.d / 2, true);

	// What comes out of the box, true to each other's scale (a 210 mm page is 1 unit, the A3 map 2).
	const FAN_K = 1.0 / PAGE_H;
	const FAN_GAP = 0.14;
	const fanW = KIT_PRINTS.map((k) => k.w * FAN_K);
	let fanX = -(fanW.reduce((a, b) => a + b, 0) + FAN_GAP * (KIT_PRINTS.length - 1)) / 2;
	const kitCards = KIT_PRINTS.map((item, i) => {
		const b = billboard();
		const h = item.h * FAN_K;
		// Painted ~1500 px tall whatever their size, so each stays sharp when the camera moves in.
		const m = add(b, plane(fanW[i], h), paper(keep(print(item.w, item.h, Math.min(6, 1500 / item.h), item.paint).texture)));
		const x = fanX + fanW[i] / 2;
		fanX += fanW[i] + FAN_GAP;
		return { b, m, x, h };
	});

	/* ---------- the profile being made: sticker sheet, Paper Profile pages, tokens in flight ---------- */
	const desk = billboard();
	desk.position.set(...DESK_AT);
	// One scale for the sheet and the pages, so a sticker fits its circle.
	const DK = 3.0 / DESK_W;
	const CARD = { w: DESK_W * DK, h: PAGE_H * DK };
	const SHEET = { w: SHEET_W * DK, h: SHEET_H * DK };
	const deskW = SHEET.w + 0.16 + CARD.w;
	const SX = -deskW / 2 + SHEET.w / 2;
	const SY = (SHEET.h - CARD.h) / 2;
	const CX = deskW / 2 - CARD.w / 2;
	const sheetPrint = print(SHEET_W, SHEET_H, 2.2);
	const homePrint = print(DESK_W, PAGE_H, 2);
	keep(sheetPrint.texture);
	keep(homePrint.texture);
	const sheetMesh = add(desk, plane(SHEET.w, SHEET.h), paper(sheetPrint.texture), SX, SY, 0);
	const pagesMesh = add(desk, plane(CARD.w, CARD.h), paper(homePrint.texture), CX, 0, 0);
	const tokenSize = TOKEN_R * 2 * DK * (TOKEN_CANVAS / 94);
	const tokenGeo = plane(tokenSize, tokenSize);
	const flying = SHEET_FROM.map((slot, k) => {
		const m = add(desk, tokenGeo, paper(keep(print(TOKEN_CANVAS, TOKEN_CANVAS, 2, paintToken(NOOR.tokens[k])).texture), true), 0, 0, 0.03);
		const [sx, sy] = sheetSlot(slot);
		const [cx, cy] = tokenCenter(k, DESK_PAGES);
		return {
			m,
			from: [SX + (sx / SHEET_W - 0.5) * SHEET.w, SY + (0.5 - sy / SHEET_H) * SHEET.h],
			to: [CX + (cx / DESK_W - 0.5) * CARD.w, (0.5 - cy / PAGE_H) * CARD.h]
		};
	});

	/* Noor's finished profile, closed: its cover. */
	const noorCover = keep(print(PAGE_W, PAGE_H, 1, paintCover(NOOR)).texture);
	const carried = billboard();
	add(carried, plane(0.62, (0.62 * PAGE_H) / PAGE_W), paper(noorCover));

	/* ---------- booklet of public profiles, on a lectern ---------- */
	const booklet = new Group();
	booklet.position.set(BOOKLET_AT[0], 0, BOOKLET_AT[1]);
	group.add(booklet);
	add(booklet, box(0.16, 1.4, 0.16), M.black, 0, 0.7, -0.2, true);
	const spread = new Group();
	spread.position.set(0, 2.05, 0);
	spread.rotation.x = -0.5;
	booklet.add(spread);
	// Each booklet page holds one profile copy: its cover and its interests page.
	const PG = { w: 1.7, h: (1.7 * PAGE_H) / BOOK_W };
	add(spread, box(PG.w * 2 + 0.24, PG.h + 0.24, 0.06), M.black, 0, 0, -0.04, true);
	const pageGeo = plane(PG.w, PG.h);
	const rightPrint = print(BOOK_W, PAGE_H, 1.8);
	const backPrint = print(BOOK_W, PAGE_H, 1.8);
	keep(rightPrint.texture);
	keep(backPrint.texture);
	add(spread, pageGeo, paper(keep(print(BOOK_W, PAGE_H, 1.8, paintProfile(BOOK_PAGES, ADA)).texture)), -PG.w / 2, 0, 0);
	add(spread, pageGeo, paper(rightPrint.texture), PG.w / 2, 0, 0);
	const leaf = new Group();
	leaf.position.z = 0.03;
	spread.add(leaf);
	add(leaf, pageGeo, paper(keep(print(BOOK_W, PAGE_H, 1.8, paintProfile(BOOK_PAGES, ILYAS)).texture)), PG.w / 2, 0, 0.006);
	add(leaf, pageGeo, paper(backPrint.texture), PG.w / 2, 0, -0.006).rotation.y = Math.PI;
	add(spread, box(0.03, PG.h, 0.02), M.inkFlat, 0, 0, 0.012);
	// The matching interest: a blob chain drawn by the engine over the spread.
	const tokenOnPage = (pageLeft: number, i: number): [number, number] => {
		const [cx, cy] = tokenCenter(i, BOOK_PAGES);
		return [pageLeft + cx, cy];
	};
	const matchA = tokenOnPage(0, 1);
	const matchB = tokenOnPage(BOOK_W, 0);
	const matchSurface = host.surface(BOOK_W * 2, PAGE_H, CHAIN_PARAMS);
	const spreadGeo = plane(PG.w * 2, PG.h);
	const matchPlane = add(spread, spreadGeo, matchSurface.material, 0, 0, 0.07);
	const leavesPlane = add(spread, spreadGeo, paper(keep(print(BOOK_W * 2, PAGE_H, 1, paintMatchLeaves(matchA, matchB)).texture), true), 0, 0, 0.075);
	leavesPlane.renderOrder = 6;

	/* ---------- private profile and the request slip ---------- */
	const priv = billboard();
	priv.position.set(...PRIV_CARD_AT);
	const privPrint = print(BOOK_W, PAGE_H, 1.8);
	keep(privPrint.texture);
	const PRIV = { w: 2.6, h: (2.6 * PAGE_H) / BOOK_W };
	add(priv, plane(PRIV.w, PRIV.h), paper(privPrint.texture));
	const slip = billboard();
	add(slip, plane(1.3, (1.3 * 112) / 250), paper(keep(print(250, 112, 3, paintSlip).texture)));

	/* ---------- public symbol board, the form, pins in the streets ---------- */
	const board = new Group();
	board.position.set(BOARD_AT[0], 0, BOARD_AT[1]);
	group.add(board);
	const BD = { w: 3.3, h: (3.3 * BOARD_H) / BOARD_W, y: 2.25 };
	add(board, box(0.12, 1.1, 0.12), M.black, -1.2, 0.55, 0, true);
	add(board, box(0.12, 1.1, 0.12), M.black, 1.2, 0.55, 0, true);
	const boardPrint = print(BOARD_W, BOARD_H, 2);
	keep(boardPrint.texture);
	const boardMesh = add(board, box(BD.w, BD.h, 0.08), fronted(M.white, paper(boardPrint.texture)), 0, BD.y, 0, true);
	const formPrint = print(FORM_W, FORM_H, 2);
	keep(formPrint.texture);
	const FORM = { w: 1.45, h: (1.45 * FORM_H) / FORM_W };
	const form = add(board, plane(FORM.w, FORM.h), paper(formPrint.texture));
	const [cellX, cellY] = boardCell(5);
	const formFrom = new Vector3(-0.2, 2.2, 1.2);
	const formTo = new Vector3(((cellX + BOARD_CELL / 2) / BOARD_W - 0.5) * BD.w, BD.y + (0.5 - (cellY + BOARD_CELL / 2) / BOARD_H) * BD.h, 0.07);
	const formEndScale = ((BOARD_CELL / BOARD_W) * BD.w) / FORM.w;

	const pinPole = keep(new CylinderGeometry(0.05, 0.05, 2.2, 6));
	const pinTexture = keep(print(128, 128, 2, paintPin).texture);
	const pinGeo = plane(1.5, 1.5);
	const pins = PINS.map((at) => {
		const g = new Group();
		g.position.set(at[0], 0, at[1]);
		group.add(g);
		add(g, pinPole, M.black, 0, 1.1, 0, true);
		const head = billboard(g);
		head.position.y = 2.7;
		add(head, pinGeo, paper(pinTexture, true));
		return g;
	});

	/* ---------- reaching other Blobs: copies, fibre, light ---------- */
	const copyTexture = keep(print(COPY_W, COPY_H, 0.5, paintCopy).texture);
	const copyGeo = plane(1.5, (1.5 * COPY_H) / COPY_W);
	const cableGeo = box(0.14, 0.04, 1).translate(0, 0, 0.5);
	const pulseOuter = keep(new CircleGeometry(0.62, 24));
	const pulseInner = keep(new CircleGeometry(0.44, 24));
	const routes = OTHER_BLOBS.map((o, i) => {
		const dx = o.at[0] - LOCAL_BLOB[0];
		const dz = o.at[1] - LOCAL_BLOB[1];
		const copy = billboard();
		add(copy, copyGeo, paper(copyTexture));
		const cable = new Group();
		cable.position.set(LOCAL_BLOB[0], 0.05, LOCAL_BLOB[1]);
		cable.rotation.y = Math.atan2(dx, dz);
		group.add(cable);
		const line = add(cable, cableGeo, M.inkFlat);
		const pulses = [0, 1, 2].map(() => {
			const g = new Group();
			g.rotation.x = FLAT;
			add(g, pulseOuter, M.inkFlat, 0, 0, 0.09);
			add(g, pulseInner, M.greenFlat, 0, 0, 0.1);
			group.add(g);
			return g;
		});
		return { o, i, dx, dz, len: Math.hypot(dx, dz), copy, line, pulses, rest: [o.at[0] + (o.at[0] < 0 ? 3.4 : -3.4), o.at[1] + 1.2] as [number, number] };
	});

	/* ---------- named points ---------- */
	const v = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
	const anchors: Record<AnchorId, Vector3> = {
		localBlob: v(LOCAL_BLOB[0], 4.3, LOCAL_BLOB[1] + 0.6),
		op1: v(OPERATORS[0][0], 1.6, OPERATORS[0][1]),
		op2: v(OPERATORS[1][0], 1.6, OPERATORS[1][1]),
		noor: v(),
		sam: v(),
		kit: v(KIT_AT[0], 0, KIT_AT[1] + 0.95),
		booklet: v(BOOKLET_AT[0], 2.95, BOOKLET_AT[1] - 0.4),
		bookletFoot: v(BOOKLET_AT[0], 0.85, BOOKLET_AT[1] + 0.6),
		board: v(BOARD_AT[0], BD.y + BD.h / 2 + 0.1, BOARD_AT[1]),
		counter: v(COUNTER_AT[0], COUNTER_AT[1] - 0.45, COUNTER_AT[2] + 0.5),
		choice: v(LOCAL_BLOB[0], 0, LOCAL_BLOB[1] + 4.6),
		privCard: v(PRIV_CARD_AT[0], PRIV_CARD_AT[1] - 1.2, PRIV_CARD_AT[2]),
		pinA: v(PINS[0][0], 3.55, PINS[0][1]),
		pinB: v(PINS[1][0], 3.55, PINS[1][1]),
		otherA: v(OTHER_BLOBS[0].at[0], 3.6, OTHER_BLOBS[0].at[1]),
		otherB: v(OTHER_BLOBS[1].at[0], 3.6, OTHER_BLOBS[1].at[1]),
		otherC: v(OTHER_BLOBS[2].at[0], 3.6, OTHER_BLOBS[2].at[1])
	};

	/* ---------- repaint only when a print's inputs change ---------- */
	const painted = new Map<object, string>();
	const repaint = (p: { paint(fn: (ctx: CanvasRenderingContext2D) => void): void }, key: string, fn: (ctx: CanvasRenderingContext2D) => void) => {
		if (painted.get(p) === key) return;
		painted.set(p, key);
		p.paint(fn);
	};
	const q = (x: number) => x.toFixed(2);
	const q4 = (x: number) => x.toFixed(4);

	const gx = (x: number) => (x - GROUND.x0) * ppu;
	const gz = (z: number) => (z - GROUND.z0) * ppu;
	const localPx: [number, number] = [gx(LOCAL_BLOB[0]), gz(LOCAL_BLOB[1])];

	function groundBlobs(s: WorldState): SurfaceBlob[] {
		const out: SurfaceBlob[] = [];
		const reachR = s.green * 75;
		const put = (id: number, at: XZ, r: number) => {
			if (r < 0.02) return;
			const d = Math.hypot(at[0] - LOCAL_BLOB[0], at[1] - LOCAL_BLOB[1]);
			out.push({ id, x: gx(at[0]), y: gz(at[1]), r: r * ppu, color: reachR > d + r ? P.black : P.green });
		};
		// Islands appear one after another as the network grows.
		const grow = (i: number) => {
			const d = ((i * 0.137) % 1) * 0.5;
			return ease((s.network - d) / 0.5);
		};
		HOUSES.forEach((h, i) => put(1 + i, h.at, 2.3 * h.s * grow(i)));
		LINKS.forEach((l, i) => put(20 + i, l.at, l.r * grow(i + 5)));
		put(40, LOCAL_BLOB, 3.0 * Math.max(ease(s.network), ease(s.blobSpot)));
		OPERATORS.forEach((at, i) => put(41 + i, at, 0.85 * ease(s.blobSpot)));
		OTHER_BLOBS.forEach((o, i) => put(50 + i, o.at, 2.3 * ease(s.far)));
		if (s.chains > 0.01) {
			const color = reachR > 30 ? P.black : P.green;
			for (const r of routes) out.push(...chain(100 + r.i * 100, localPx, [gx(r.o.at[0]), gz(r.o.at[1])], s.chains, color, 0.3 * ppu, r.o.bend));
		}
		return out;
	}

	function walk(p: Object3D, a: XZ, b: XZ, t: number) {
		p.position.set(lerp(a[0], b[0], t), Math.sin(t * Math.PI * 9) ** 2 * 0.07, lerp(a[1], b[1], t));
	}

	function apply(s: WorldState) {
		/* shadows: the walkers, the kit and its lid, and the pins are the only casters that move */
		const key = [s.walkNoor, s.sam, s.kit, s.kitOpen, s.pins, s.town, s.home, s.book, s.boardUp, s.east, s.blobSpot, s.far, s.priv].map(q4).join('|');
		if (key !== shadowKey) {
			shadowKey = key;
			sun.shadow.needsUpdate = true;
		}

		/* pop-up: what stands, and what lies folded flat */
		const town = ease(s.town);
		const east = Math.max(town, ease(s.east));
		for (const h of houses) fold(h.g, h.home ? Math.max(town, ease(s.home)) : h.east ? east : town, h.s);
		for (const st of streets) {
			const v = st.east ? east : town;
			st.strip.visible = v > 0.01;
			if (st.alongX) st.strip.scale.y = Math.max(0.001, v);
			else st.strip.scale.x = Math.max(0.001, v);
			st.dashes.visible = v > 0.7;
		}
		const local = Math.max(town, ease(s.blobSpot));
		fold(localKiosk, local, 1);
		for (const o of operators) show(o, local);
		for (const k of otherKiosks) fold(k, Math.max(town, ease(s.far)), 0.78);
		fold(booklet, Math.max(town, ease(s.book)), 1);
		fold(board, Math.max(town, ease(s.boardUp), ease(s.form)), 1);
		show(sam, Math.max(town, ease(clamp01(s.sam * 6)), ease(s.priv)));
		show(noor, Math.max(town, ease(s.home), local));

		/* ground */
		ground.set(groundBlobs(s));
		greenDisc.visible = s.green > 0.001;
		greenDisc.scale.setScalar(Math.max(0.001, s.green * 75));

		/* characters */
		walk(noor, NOOR_HOME, NOOR_AT_BLOB, clamp01(s.walkNoor));
		walk(sam, SAM_HOME, SAM_AT_BLOB, clamp01(s.sam));
		anchors.noor.set(noor.position.x, 0, noor.position.z + 0.3);
		anchors.sam.set(sam.position.x, 0, sam.position.z + 0.3);

		/* kit */
		show(kit, ease(s.kit));
		lid.rotation.x = -1.9 * ease(s.kitOpen);
		const mid = (kitCards.length - 1) / 2;
		kitCards.forEach(({ b, m, x, h }, i) => {
			const p = ease(clamp01(s.kitFan * 1.6 - i * 0.12));
			const k = i - mid;
			// Bottom edges on a gentle arch, so prints of different heights still read as one fan.
			b.position.set(KIT_AT[0] + lerp(0, x, p), lerp(0.4, 1.05 + Math.cos((k / mid) * 1.1) * 0.35 + h / 2, p), KIT_AT[1] + lerp(0, 0.25, p));
			show(b, p * ease(s.kit));
			m.rotation.z = (-k * 4 * p * Math.PI) / 180;
		});

		/* profile desk */
		show(desk, ease(s.profile));
		if (desk.visible) {
			const flown = flying.map((_, k) => clamp01(s.pTokens - k));
			repaint(sheetPrint, String(flown.filter((f) => f > 0).length), paintSheet(flown.filter((f) => f > 0).length));
			const anim = { photo: s.pPhoto, name: s.pName, story: s.pStory, tokens: flown.map((f) => (f >= 1 ? 1 : 0)), written: s.pWritten };
			repaint(homePrint, [q(s.pPhoto), q(s.pName), q(s.pStory), anim.tokens.join(''), q(s.pWritten)].join('|'), paintProfile(DESK_PAGES, NOOR, anim));
			flying.forEach((f, k) => {
				const t = flown[k];
				f.m.visible = t > 0 && t < 1;
				if (!f.m.visible) return;
				const e = ease(t);
				const arc = Math.sin(e * Math.PI);
				f.m.position.set(lerp(f.from[0], f.to[0], e), lerp(f.from[1], f.to[1], e) + arc * 0.35, 0.03);
				f.m.scale.setScalar(1 + arc * 0.25);
			});
		}

		/* carried profile, handed over the counter */
		const hand = ease(s.handIn);
		carried.position.set(lerp(noor.position.x, COUNTER_AT[0], hand), lerp(2.15, COUNTER_AT[1], hand) + Math.sin(hand * Math.PI) * 0.5, lerp(noor.position.z, COUNTER_AT[2], hand));
		show(carried, ease(s.carry) * (1 - hand * hand));

		/* booklet */
		leaf.rotation.y = -Math.PI * clamp01(s.flip);
		const matched = s.match > 0.02;
		repaint(rightPrint, matched ? 'm' : '-', paintProfile(BOOK_PAGES, NOOR, { hideTokens: matched ? [0] : [] }));
		repaint(backPrint, matched ? 'm' : '-', paintProfile(BOOK_PAGES, SAM, { hideTokens: matched ? [1] : [] }));
		matchPlane.visible = leavesPlane.visible = matched;
		if (matched) {
			matchSurface.set([
				{ id: 1, x: matchA[0], y: matchA[1], r: TOKEN_R, color: P.green },
				{ id: 2, x: matchB[0], y: matchB[1], r: TOKEN_R, color: P.green },
				...chain(10, matchA, matchB, s.match, P.green, 11, 1.2)
			]);
		}

		/* private profile and request slip */
		show(priv, ease(s.priv));
		if (priv.visible) repaint(privPrint, q(s.cover), paintProfile(BOOK_PAGES, NOOR, { cover: s.cover }));
		const a = s.slip <= 1 ? [sam.position.x, 2.2, sam.position.z] : [COUNTER_AT[0], COUNTER_AT[1] + 0.25, COUNTER_AT[2] + 0.5];
		const b = s.slip <= 1 ? [COUNTER_AT[0], COUNTER_AT[1] + 0.25, COUNTER_AT[2] + 0.5] : [PRIV_CARD_AT[0], PRIV_CARD_AT[1] - 0.6, PRIV_CARD_AT[2] + 0.3];
		const st = ease(s.slip <= 1 ? s.slip : s.slip - 1);
		slip.position.set(lerp(a[0], b[0], st), lerp(a[1], b[1], st) + Math.sin(st * Math.PI) * 0.7, lerp(a[2], b[2], st));
		show(slip, ease(s.slipOn));

		/* symbols */
		repaint(boardPrint, s.symbol > 0.5 ? '1' : '0', paintBoard(s.symbol));
		const fly = ease(s.toBoard);
		form.visible = s.form > 0.01;
		if (form.visible) {
			repaint(formPrint, q(s.formDraw), paintForm(s.formDraw));
			form.position.lerpVectors(formFrom, formTo, fly);
			form.position.y += Math.sin(fly * Math.PI) * 0.25;
			form.scale.setScalar(ease(s.form) * lerp(1, formEndScale, fly));
		}
		pins.forEach((g, i) => show(g, ease(clamp01(s.pins * 1.5 - i * 0.5))));

		/* other Blobs */
		for (const r of routes) {
			const t = ease(s.copies);
			const [cx, cz] = chainPoint(LOCAL_BLOB as [number, number], r.rest, t, r.o.bend);
			r.copy.position.set(cx, 2.3, cz);
			show(r.copy, clamp01(s.copies * 6));
			const f = ease(s.fibre);
			r.line.visible = f > 0.001;
			r.line.scale.z = Math.max(0.001, f * r.len);
			r.pulses.forEach((p, k) => {
				let u = (s.pulse + k / 3 + r.i * 0.17) % 1;
				if ((k + r.i) % 2) u = 1 - u;
				// Fade out where the cable runs under a kiosk.
				const edge = ease((u - 0.1) / 0.06) * (1 - ease((u - 0.88) / 0.06));
				p.position.set(LOCAL_BLOB[0] + r.dx * u, 0, LOCAL_BLOB[1] + r.dz * u);
				show(p, clamp01((s.fibre - 0.9) * 10) * edge);
			});
		}
	}

	/* ---------- prints to look at closely ---------- */
	const pageW = CARD.w / DESK_PAGES.length;
	const deskPage = (k: number): Subject => ({ obj: pagesMesh, at: [(k - (DESK_PAGES.length - 1) / 2) * pageW, 0], w: pageW, h: CARD.h });
	// The booklet lies tilted back by 0.5 rad: look at it square on.
	const bookEl = (0.5 * 180) / Math.PI;
	const kitIds = ['kitMap', 'kitProfile', 'kitTokens', 'kitSymbols', 'kitCards'] as const;
	const subjects: Record<SubjectId, Subject> = {
		...(Object.fromEntries(kitCards.map((c, i) => [kitIds[i], { obj: c.m as Object3D, w: fanW[i], h: c.h }])) as unknown as Record<(typeof kitIds)[number], Subject>),
		sheet: { obj: sheetMesh, w: SHEET.w, h: SHEET.h },
		cover: deskPage(0),
		story: deskPage(1),
		interests: deskPage(2),
		bookLeft: { obj: spread, at: [-PG.w / 2, 0], w: PG.w, h: PG.h, az: 0, el: bookEl },
		bookRight: { obj: spread, at: [PG.w / 2, 0], w: PG.w, h: PG.h, az: 0, el: bookEl },
		priv: { obj: priv, w: PRIV.w, h: PRIV.h },
		board: { obj: boardMesh, w: BD.w, h: BD.h, az: 0, el: 6 }
	};

	const showing = (o: Object3D | null) => {
		for (; o; o = o.parent) if (!o.visible || o.scale.x < 0.5) return false;
		return true;
	};
	const scale = new Vector3();
	function locate(id: SubjectId, out: Vector3) {
		const sub = subjects[id];
		if (!showing(sub.obj)) return null;
		sub.obj.updateWorldMatrix(true, false);
		out.set(sub.at?.[0] ?? 0, sub.at?.[1] ?? 0, 0);
		sub.obj.localToWorld(out);
		const k = sub.obj.getWorldScale(scale).x;
		return { w: sub.w * k, h: sub.h * k };
	}

	// What a click can land on. The desk's pages are one mesh: the hit point says which page.
	const pickables: { mesh: Object3D; id: (u: number) => SubjectId }[] = [
		...kitCards.map((c, i) => ({ mesh: c.m as Object3D, id: () => kitIds[i] })),
		{ mesh: sheetMesh, id: () => 'sheet' },
		{ mesh: pagesMesh, id: (u) => (['cover', 'story', 'interests'] as const)[Math.min(2, Math.floor(u * 3))] },
		{ mesh: priv.children[0], id: () => 'priv' },
		{ mesh: boardMesh, id: () => 'board' },
		...spread.children.filter((c) => c instanceof Mesh && c.geometry === pageGeo).map((mesh) => ({ mesh, id: () => 'bookLeft' as SubjectId })),
		...leaf.children.map((mesh) => ({ mesh, id: () => 'bookLeft' as SubjectId }))
	];
	function pick(ray: Raycaster): SubjectId | null {
		let best: { d: number; id: SubjectId } | null = null;
		for (const p of pickables) {
			if (!showing(p.mesh)) continue;
			const hit = ray.intersectObject(p.mesh, false)[0];
			if (!hit || (best && best.d < hit.distance)) continue;
			let id = p.id(hit.uv?.x ?? 0);
			// Booklet pages: left or right of the spine.
			if (id === 'bookLeft') id = spread.worldToLocal(hit.point.clone()).x > 0 ? 'bookRight' : 'bookLeft';
			best = { d: hit.distance, id };
		}
		return best?.id ?? null;
	}

	return {
		group,
		anchors,
		billboards,
		subjects,
		locate,
		pick,
		apply,
		dispose() {
			for (const d of bin) d.dispose();
		}
	};
}
