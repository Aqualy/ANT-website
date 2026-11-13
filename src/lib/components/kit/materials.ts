import { MeshStandardMaterial, type Material } from 'three';
import type { KitTextures } from './textures';

/** Matte, print-like materials in the ANT palette. Shared across meshes and disposed together. */
export function createMaterials(t: KitTextures) {
	const matte = (color: string, roughness = 0.85) => new MeshStandardMaterial({ color, roughness, metalness: 0 });
	const printed = (map: KitTextures[keyof KitTextures], roughness = 0.8) =>
		new MeshStandardMaterial({ map, roughness, metalness: 0 });

	const m = {
		black: matte('#000000', 0.78),
		grey: matte('#dddddd', 0.95),
		white: matte('#ffffff', 0.92),
		green: matte('#c5d92f', 0.85),
		paper: matte('#ffffff', 0.95),

		lidTop: printed(t.lidTop, 0.75),
		boxFront: printed(t.boxFront, 0.75),
		boxBack: printed(t.boxBack, 0.75),
		cardBoxFront: printed(t.cardBoxFront, 0.7),
		cardBoxBack: printed(t.cardBoxBack, 0.7),
		cardFront: printed(t.cardFront, 0.75),
		cardFront2: printed(t.cardFront2, 0.75),
		cardBack: printed(t.cardBack, 0.75),
		profileCover: printed(t.profileCover, 0.9),
		profileBack: printed(t.profileBack, 0.9),
		// The sticker sheet is glossy.
		stickerSheet: printed(t.stickerSheet, 0.35),
		template: printed(t.template, 0.95),
		map: printed(t.map, 0.95)
	};
	return m;
}

export type KitMaterials = ReturnType<typeof createMaterials>;

export function disposeMaterials(m: KitMaterials | null) {
	if (!m) return;
	for (const mat of Object.values(m) as Material[]) mat.dispose();
}

/**
 * BoxGeometry material order: +x, -x, +y, -y, +z, -z.
 * Helper to build that array from named faces with a default.
 */
export function faces(
	base: Material,
	f: Partial<Record<'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz', Material>>
): Material[] {
	return [f.px ?? base, f.nx ?? base, f.py ?? base, f.ny ?? base, f.pz ?? base, f.nz ?? base];
}
