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
	CARD_H,
	CARD_W,
	FORM_H,
	FORM_W,
	ILYAS,
	KIT_CARDS,
	NOOR,
	PAGE_H,
	PAGE_K,
	PAGE_PAD,
	PAGE_W,
	SAM,
	SHEET_FROM,
	SHEET_H,
	SHEET_W,
	TOKEN_R,
	boardCell,
	paintBoard,
	paintCopy,
	paintForm,
	paintKitCard,
	paintKitFront,
	paintMatchLeaves,
	paintPage,
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

export type World = {
	group: Group;
	anchors: Record<AnchorId, Vector3>;
	/** Flat paper that should face the viewer: copy the camera's quaternion onto these. */
	billboards: Object3D[];
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
	const M = { white: lit(P.white), black: lit(P.black), green: lit(P.green), inkFlat: flat(P.black), greenFlat: flat(P.green), whiteFlat: flat(P.white) };

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

	for (const s of STREETS) {
		const alongX = s.a[1] === s.b[1];
		const len = alongX ? s.b[0] - s.a[0] : s.b[1] - s.a[1];
		const m = add(group, alongX ? plane(len, s.w) : plane(s.w, len), M.whiteFlat, (s.a[0] + s.b[0]) / 2, 0.012, (s.a[1] + s.b[1]) / 2);
		m.rotation.x = FLAT;
	}

	// Dashed centre lines, so a street reads as a street even when only a strip of it is in view.
	const DASH = 1.5;
	const dashes: [number, number, boolean][] = [];
	for (const s of STREETS) {
		const alongX = s.a[1] === s.b[1];
		const from = alongX ? s.a[0] : s.a[1];
		const to = alongX ? s.b[0] : s.b[1];
		for (let d = from + DASH / 2; d < to; d += DASH) dashes.push(alongX ? [d, s.a[1], true] : [s.a[0], d, false]);
	}
	const dashMesh = new InstancedMesh(plane(0.5, 0.05).rotateX(FLAT), M.inkFlat, dashes.length);
	const mat = new Matrix4();
	dashes.forEach(([x, z, alongX], i) => {
		mat.makeRotationY(alongX ? 0 : Math.PI / 2).setPosition(x, 0.016, z);
		dashMesh.setMatrixAt(i, mat);
	});
	group.add(dashMesh);
	bin.push(dashMesh);

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
	for (const h of HOUSES) {
		const g = new Group();
		g.position.set(h.at[0], 0, h.at[1]);
		g.rotation.y = (h.turn * Math.PI) / 2;
		g.scale.setScalar(h.s);
		add(g, houseBody, M.white, 0, 0, 0, true);
		add(g, houseRoof, M.white, 0, 0, 0, true);
		add(g, door, M.inkFlat, 0.6, 0.5, 1.302);
		add(g, windowPane, M.inkFlat, -0.7, 1.05, 1.302);
		group.add(g);
	}

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
	};
	kiosk(LOCAL_BLOB, 1, signLocal);
	for (const o of OTHER_BLOBS) kiosk(o.at, 0.78, signOther);

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
	for (const at of OPERATORS) pawn(M.black, M.black, M.green).position.set(at[0], 0, at[1]);

	/* ---------- Blackout Communication Kit ---------- */
	const kit = new Group();
	kit.position.set(KIT_AT[0], 0, KIT_AT[1]);
	group.add(kit);
	add(kit, box(2.0, 0.7, 1.3), fronted(M.black, paper(keep(print(400, 140, 3, paintKitFront).texture))), 0, 0.35, 0, true);
	const lid = new Group();
	lid.position.set(0, 0.7, -0.65);
	kit.add(lid);
	add(lid, box(2.06, 0.12, 1.36), M.black, 0, 0.06, 0.68, true);
	const cardGeo = plane(0.74, 1.036);
	const kitCards = KIT_CARDS.map((item) => {
		const b = billboard();
		const m = add(b, cardGeo, paper(keep(print(140, 196, 3, paintKitCard(item)).texture)));
		return { b, m };
	});

	/* ---------- the profile being made: sticker sheet, card, tokens in flight ---------- */
	const desk = billboard();
	desk.position.set(...DESK_AT);
	const CARD = { w: 1.85, h: (1.85 * CARD_H) / CARD_W, x: 0.42 };
	const SHEET = { w: 0.9, h: (0.9 * SHEET_H) / SHEET_W, x: -1.6, y: -0.25 };
	const sheetPrint = print(SHEET_W, SHEET_H, 3);
	const homePrint = print(CARD_W, CARD_H, 2);
	keep(sheetPrint.texture);
	keep(homePrint.texture);
	add(desk, plane(SHEET.w, SHEET.h), paper(sheetPrint.texture), SHEET.x, SHEET.y, 0);
	add(desk, plane(CARD.w, CARD.h), paper(homePrint.texture), CARD.x, 0, 0);
	const tokenSize = ((TOKEN_R * 2) / CARD_W) * CARD.w * (96 / 94);
	const tokenGeo = plane(tokenSize, tokenSize);
	const flying = SHEET_FROM.map((slot, k) => {
		const m = add(desk, tokenGeo, paper(keep(print(96, 96, 2, paintToken(NOOR.tokens[k])).texture), true), 0, 0, 0.03);
		const [sx, sy] = sheetSlot(slot);
		const [cx, cy] = tokenCenter(k);
		return {
			m,
			from: [SHEET.x + (sx / SHEET_W - 0.5) * SHEET.w, SHEET.y + (0.5 - sy / SHEET_H) * SHEET.h],
			to: [CARD.x + (cx / CARD_W - 0.5) * CARD.w, (0.5 - cy / CARD_H) * CARD.h]
		};
	});

	/* Noor's finished profile, reused wherever it is whole. */
	const noorFull = keep(print(CARD_W, CARD_H, 1, (ctx) => paintProfile(ctx, NOOR)).texture);
	const carried = billboard();
	add(carried, plane(0.62, (0.62 * CARD_H) / CARD_W), paper(noorFull));

	/* ---------- booklet of public profiles, on a lectern ---------- */
	const booklet = new Group();
	booklet.position.set(BOOKLET_AT[0], 0, BOOKLET_AT[1]);
	group.add(booklet);
	add(booklet, box(0.16, 1.4, 0.16), M.black, 0, 0.7, -0.2, true);
	const spread = new Group();
	spread.position.set(0, 2.05, 0);
	spread.rotation.x = -0.5;
	booklet.add(spread);
	const PG = { w: 1.5, h: (1.5 * PAGE_H) / PAGE_W };
	add(spread, box(PG.w * 2 + 0.24, PG.h + 0.24, 0.06), M.black, 0, 0, -0.04, true);
	const pageGeo = plane(PG.w, PG.h);
	const rightPrint = print(PAGE_W, PAGE_H, 2);
	const backPrint = print(PAGE_W, PAGE_H, 2);
	keep(rightPrint.texture);
	keep(backPrint.texture);
	add(spread, pageGeo, paper(keep(print(PAGE_W, PAGE_H, 2, paintPage(ADA)).texture)), -PG.w / 2, 0, 0);
	add(spread, pageGeo, paper(rightPrint.texture), PG.w / 2, 0, 0);
	const leaf = new Group();
	leaf.position.z = 0.03;
	spread.add(leaf);
	add(leaf, pageGeo, paper(keep(print(PAGE_W, PAGE_H, 2, paintPage(ILYAS)).texture)), PG.w / 2, 0, 0.006);
	add(leaf, pageGeo, paper(backPrint.texture), PG.w / 2, 0, -0.006).rotation.y = Math.PI;
	add(spread, box(0.03, PG.h, 0.02), M.inkFlat, 0, 0, 0.012);
	// The matching interest: a blob chain drawn by the engine over the spread.
	const SK = 1.5;
	const tokenOnPage = (pageLeft: number, i: number): [number, number] => {
		const [cx, cy] = tokenCenter(i);
		return [(pageLeft + PAGE_PAD.x + cx * PAGE_K) * SK, (PAGE_PAD.y + cy * PAGE_K) * SK];
	};
	const matchA = tokenOnPage(0, 1);
	const matchB = tokenOnPage(PAGE_W, 0);
	const matchSurface = host.surface(PAGE_W * 2 * SK, PAGE_H * SK, CHAIN_PARAMS);
	const spreadGeo = plane(PG.w * 2, PG.h);
	const matchPlane = add(spread, spreadGeo, matchSurface.material, 0, 0, 0.07);
	const leavesPlane = add(
		spread,
		spreadGeo,
		paper(keep(print(PAGE_W * 2 * SK, PAGE_H * SK, 1, paintMatchLeaves(matchA, matchB)).texture), true),
		0,
		0,
		0.075
	);
	leavesPlane.renderOrder = 6;

	/* ---------- private profile and the request slip ---------- */
	const priv = billboard();
	priv.position.set(...PRIV_CARD_AT);
	const privPrint = print(CARD_W, CARD_H, 2);
	keep(privPrint.texture);
	add(priv, plane(1.95, (1.95 * CARD_H) / CARD_W), paper(privPrint.texture));
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
	add(board, box(BD.w, BD.h, 0.08), fronted(M.white, paper(boardPrint.texture)), 0, BD.y, 0, true);
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
	const copyTexture = keep(print(68, 88, 3, paintCopy).texture);
	const copyGeo = plane(1.9, (1.9 * 88) / 68);
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
		kit: v(KIT_AT[0], 0, KIT_AT[1] + 0.9),
		booklet: v(BOOKLET_AT[0], 3.25, BOOKLET_AT[1] - 0.5),
		bookletFoot: v(BOOKLET_AT[0], 0.85, BOOKLET_AT[1] + 0.6),
		board: v(BOARD_AT[0], BD.y + BD.h / 2 + 0.1, BOARD_AT[1]),
		counter: v(COUNTER_AT[0], COUNTER_AT[1] - 0.45, COUNTER_AT[2] + 0.5),
		choice: v(LOCAL_BLOB[0], 0, LOCAL_BLOB[1] + 4.6),
		privCard: v(PRIV_CARD_AT[0], PRIV_CARD_AT[1] - 1.4, PRIV_CARD_AT[2]),
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
		const key = [s.walkNoor, s.sam, s.kit, s.kitOpen, s.pins].map(q4).join('|');
		if (key !== shadowKey) {
			shadowKey = key;
			sun.shadow.needsUpdate = true;
		}

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
		kitCards.forEach(({ b, m }, i) => {
			const p = ease(clamp01(s.kitFan * 1.6 - i * 0.12));
			const k = i - 2.5;
			b.position.set(
				KIT_AT[0] + lerp(0, k * 0.93, p),
				lerp(0.45, 2.2 + Math.cos((k / 2.5) * 1.1) * 0.42, p),
				KIT_AT[1] + lerp(0, 0.25, p)
			);
			show(b, p * ease(s.kit));
			m.rotation.z = (-k * 5 * p * Math.PI) / 180;
		});

		/* profile desk */
		show(desk, ease(s.profile));
		if (desk.visible) {
			const flown = flying.map((_, k) => clamp01(s.pTokens - k));
			repaint(sheetPrint, String(flown.filter((f) => f > 0).length), paintSheet(flown.filter((f) => f > 0).length));
			const anim = { photo: s.pPhoto, name: s.pName, story: s.pStory, tokens: flown.map((f) => (f >= 1 ? 1 : 0)), written: s.pWritten };
			repaint(homePrint, [q(s.pPhoto), q(s.pName), q(s.pStory), anim.tokens.join(''), q(s.pWritten)].join('|'), (ctx) => paintProfile(ctx, NOOR, anim));
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
		repaint(rightPrint, matched ? 'm' : '-', paintPage(NOOR, matched ? 0 : undefined));
		repaint(backPrint, matched ? 'm' : '-', paintPage(SAM, matched ? 1 : undefined));
		matchPlane.visible = leavesPlane.visible = matched;
		if (matched) {
			const r = TOKEN_R * PAGE_K * SK;
			matchSurface.set([
				{ id: 1, x: matchA[0], y: matchA[1], r, color: P.green },
				{ id: 2, x: matchB[0], y: matchB[1], r, color: P.green },
				...chain(10, matchA, matchB, s.match, P.green, 11 * SK, 3.6)
			]);
		}

		/* private profile and request slip */
		show(priv, ease(s.priv));
		if (priv.visible) repaint(privPrint, q(s.cover), (ctx) => paintProfile(ctx, NOOR, { cover: s.cover }));
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

	return {
		group,
		anchors,
		billboards,
		apply,
		dispose() {
			for (const d of bin) d.dispose();
		}
	};
}
