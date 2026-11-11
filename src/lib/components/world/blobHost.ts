/**
 * Hosts the verbatim blob engine for 3D surfaces. The engine draws inside
 * Three's own WebGL context, straight into a render target that the surface's
 * material samples: no second context, no copy through a 2D canvas and no
 * texture upload (those made every blob frame cost several megapixels of
 * transfers). Nothing is drawn when a surface's blobs are the same as last time.
 *
 * Call `set` between Three's renders (in a task), never during one.
 */
import {
	CanvasTexture,
	LinearFilter,
	LinearMipmapLinearFilter,
	MeshBasicMaterial,
	SRGBColorSpace,
	WebGLRenderTarget,
	type WebGLRenderer
} from 'three';
import { DEFAULT_PARAMS, Renderer, computePairs, hexToRgb, type BlobParams, type RenderBlob } from '#lib/blobs/engine.js';

/** A blob in the surface's own pixels. */
export type SurfaceBlob = { id: number; x: number; y: number; r: number; color: string };

export type BlobSurface = {
	/** Transparent, unlit material showing the blobs. */
	material: MeshBasicMaterial;
	/** Draws these blobs. Returns false when nothing changed. */
	set(blobs: SurfaceBlob[]): boolean;
};

export type BlobHost = {
	surface(w: number, h: number, params?: Partial<BlobParams>, mipmaps?: boolean): BlobSurface;
	dispose(): void;
};

export function createBlobHost(three: WebGLRenderer): BlobHost {
	const gl = three.getContext() as WebGL2RenderingContext;
	// What the engine takes for its canvas: it only asks for the context and reads the size.
	const target = { width: 1, height: 1, getContext: () => gl, addEventListener() {} };
	let renderer: Renderer | null = null;
	three.resetState();
	try {
		renderer = new Renderer(target as unknown as HTMLCanvasElement);
	} catch {
		renderer = null; // Surfaces fall back to plain circles.
	}
	three.resetState();

	const rgb = new Map<string, [number, number, number]>();
	const colour = (hex: string) => {
		let c = rgb.get(hex);
		if (!c) rgb.set(hex, (c = hexToRgb(hex)));
		return c;
	};
	const bin: { dispose(): void }[] = [];
	const basic = (map: MeshBasicMaterial['map']) => {
		const m = new MeshBasicMaterial({ map, transparent: true, depthWrite: false });
		bin.push(m);
		return m;
	};

	return {
		surface(w, h, params = {}, mipmaps = false) {
			const full = { ...DEFAULT_PARAMS, ...params } as BlobParams;
			let last = '';
			const changed = (live: SurfaceBlob[]) => {
				let sig = '';
				for (const b of live) sig += `${b.id}:${b.x.toFixed(2)},${b.y.toFixed(2)},${b.r.toFixed(2)},${b.color};`;
				if (sig === last) return false;
				last = sig;
				return true;
			};

			if (!renderer) {
				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext('2d')!;
				const texture = new CanvasTexture(canvas);
				texture.colorSpace = SRGBColorSpace;
				bin.push(texture);
				return {
					material: basic(texture),
					set(blobs) {
						const live = blobs.filter((b) => b.r > 0.3);
						if (!changed(live)) return false;
						ctx.clearRect(0, 0, w, h);
						for (const b of live) {
							ctx.fillStyle = b.color;
							ctx.beginPath();
							ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
							ctx.fill();
						}
						texture.needsUpdate = true;
						return true;
					}
				};
			}

			const rt = new WebGLRenderTarget(w, h, {
				depthBuffer: false,
				generateMipmaps: mipmaps,
				minFilter: mipmaps ? LinearMipmapLinearFilter : LinearFilter,
				magFilter: LinearFilter,
				anisotropy: 4
			});
			bin.push(rt);
			three.initRenderTarget(rt);
			// The engine writes sRGB values as they are, so the target stays untagged and the material decodes them.
			const material = basic(rt.texture);
			material.onBeforeCompile = (shader) => {
				shader.fragmentShader = shader.fragmentShader.replace(
					'#include <map_fragment>',
					'#include <map_fragment>\n\tdiffuseColor = sRGBTransferEOTF( diffuseColor );'
				);
			};

			return {
				material,
				set(blobs) {
					const live = blobs.filter((b) => b.r > 0.3);
					if (!renderer || gl.isContextLost() || !changed(live)) return false;
					const items: RenderBlob[] = live.map((b) => ({ id: b.id, x: b.x, y: b.y, r: b.r, rgb: colour(b.color) }));
					// Hand the context to the engine in its default state, then back to Three.
					three.resetState();
					three.setRenderTarget(rt);
					target.width = w;
					target.height = h;
					renderer.render({
						blobs: items,
						pairs: computePairs(items, full),
						params: full,
						board: { w, h },
						view: { scale: 1, ox: 0, oy: 0 },
						background: '#000000',
						transparent: true,
						clip: false
					});
					if (mipmaps) {
						gl.bindTexture(gl.TEXTURE_2D, (three.properties.get(rt.texture) as { __webglTexture: WebGLTexture }).__webglTexture);
						gl.generateMipmap(gl.TEXTURE_2D);
					}
					three.setRenderTarget(null);
					three.resetState();
					return true;
				}
			};
		},
		dispose() {
			for (const d of bin) d.dispose();
			renderer = null;
		}
	};
}

/** Blob params for chains of beads (the same as the site's story scene and the video). */
export const CHAIN_PARAMS: Partial<BlobParams> = { reach: 1.9, thickness: 0.42, flare: 0.4, smooth: 0.55, snap: 0.9, taper: 2.6, organic: 0.6, maxBridges: 4 };

/**
 * A chain of small blobs grown from p0 toward p1 up to progress g (0..1).
 * Beads swell as the front passes. Ported from the video's `chain`.
 */
export function chain(idBase: number, p0: [number, number], p1: [number, number], g: number, color: string, bead: number, bend = 1): SurfaceBlob[] {
	if (g < 0.01) return [];
	const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
	const n = Math.max(2, Math.floor(len / (bead * 2.5)));
	const out: SurfaceBlob[] = [];
	for (let k = 1; k < n; k++) {
		const t = k / n;
		if (t > g) break;
		const front = Math.max(0, 1 - Math.abs(g - t) * n * 0.35);
		const [x, y] = chainPoint(p0, p1, t, bend);
		out.push({ id: idBase + k, x, y, r: bead * (1 + front * 0.5), color });
	}
	return out;
}

/** Point along the same bent path as `chain`. */
export function chainPoint(p0: [number, number], p1: [number, number], t: number, bend = 1): [number, number] {
	const dx = p1[0] - p0[0];
	const dy = p1[1] - p0[1];
	const len = Math.hypot(dx, dy) || 1;
	const b = Math.sin(t * Math.PI) * len * 0.06 * bend;
	return [p0[0] + dx * t + (-dy / len) * b, p0[1] + dy * t + (dx / len) * b];
}
