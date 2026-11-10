<script lang="ts">
	/**
	 * Native host for the supplied blob engine. A scene is a function that
	 * places blobs (in CSS pixels of this element) for the current time, so
	 * every section can compose its own responsive layout with the original
	 * field, bridges and renderer.
	 *
	 * - Only renders while on screen and while the tab is visible.
	 * - `playing` runs a continuous loop; otherwise it draws once per change
	 *   (resize, `version`) and keeps going only while the scene reports `busy`.
	 * - Reduced motion: time stays at 0 (still frame) and scenes are told to snap.
	 * - Without WebGL2 it draws the plain circles with canvas 2D.
	 */
	import { onMount } from 'svelte';
	import { DEFAULT_PARAMS, Renderer, computePairs, hexToRgb, type BlobParams, type RenderBlob } from './engine.js';
	import type { Scene } from './types.js';

	let {
		scene,
		params = {},
		background,
		playing = false,
		version = 0,
		board,
		class: klass = ''
	}: {
		scene: Scene;
		params?: Partial<BlobParams>;
		/** Hex colour, or leave out for a transparent canvas over the page background. */
		background?: string;
		playing?: boolean;
		/** Change this to request a redraw when the scene's inputs change. */
		version?: unknown;
		/** Fixed artboard in its own units, scaled to cover the canvas (like the original driver). */
		board?: { w: number; h: number };
		class?: string;
	} = $props();

	let canvas: HTMLCanvasElement;
	const fullParams = $derived({ ...DEFAULT_PARAMS, ...params } as BlobParams);

	let renderer: Renderer | null = null;
	let ctx2d: CanvasRenderingContext2D | null = null;
	let visible = false;
	let reduced = false;
	let raf = 0;
	let time = 0;
	let last = 0;
	let busy = false;
	const rgbCache = new Map<string, [number, number, number]>();
	const rgb = (hex: string) => {
		let c = rgbCache.get(hex);
		if (!c) rgbCache.set(hex, (c = hexToRgb(hex)));
		return c;
	};

	function size(): [number, number, number] {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
		const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}
		return [canvas.clientWidth, canvas.clientHeight, dpr];
	}

	function draw(dt: number) {
		const [cw, ch, dpr] = size();
		if (cw < 2 || ch < 2) return;
		// Scene units: CSS pixels, or the artboard's own units when `board` is set.
		const W = canvas.width;
		const H = canvas.height;
		const scale = board ? Math.max(W / board.w, H / board.h) : dpr;
		const ox = board ? (W - board.w * scale) / 2 : 0;
		const oy = board ? (H - board.h * scale) / 2 : 0;
		const w = board ? board.w : cw;
		const h = board ? board.h : ch;
		const out = scene({ time: reduced ? 0 : time, dt, w, h, reduced });
		busy = !!out.busy;
		const blobs: RenderBlob[] = out.blobs.map((b) => ({ id: b.id, x: b.x, y: b.y, r: Math.max(b.r, 0), rgb: rgb(b.color) }));
		if (renderer) {
			renderer.render({
				blobs,
				pairs: computePairs(blobs, fullParams),
				params: fullParams,
				board: { w, h },
				view: { scale, ox, oy },
				background: background ?? '#000000',
				transparent: !background,
				clip: false
			});
		} else if (ctx2d) {
			ctx2d.setTransform(1, 0, 0, 1, 0, 0);
			ctx2d.clearRect(0, 0, W, H);
			if (background) {
				ctx2d.fillStyle = background;
				ctx2d.fillRect(0, 0, W, H);
			}
			ctx2d.setTransform(scale, 0, 0, scale, ox, oy);
			for (const b of out.blobs) {
				ctx2d.fillStyle = b.color;
				ctx2d.beginPath();
				ctx2d.arc(b.x, b.y, Math.max(b.r, 0), 0, Math.PI * 2);
				ctx2d.fill();
			}
		}
	}

	function frame(now: number) {
		const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
		last = now;
		if (!reduced) time += dt;
		draw(dt);
		raf = visible && !document.hidden && (playing || busy) ? requestAnimationFrame(frame) : 0;
		if (!raf) last = 0;
	}

	/** Draw now, and keep looping if the scene is playing or settling. */
	function kick() {
		if (!canvas || !visible || document.hidden || raf) return;
		raf = requestAnimationFrame(frame);
	}

	onMount(() => {
		try {
			renderer = new Renderer(canvas);
		} catch {
			renderer = null;
			ctx2d = canvas.getContext('2d');
		}

		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		reduced = mq.matches;
		const onMq = () => {
			reduced = mq.matches;
			kick();
		};
		mq.addEventListener('change', onMq);

		const io = new IntersectionObserver(
			([e]) => {
				visible = e.isIntersecting;
				kick();
			},
			{ rootMargin: '80px 0px' }
		);
		io.observe(canvas);
		const ro = new ResizeObserver(() => kick());
		ro.observe(canvas);
		const onVis = () => kick();
		document.addEventListener('visibilitychange', onVis);

		return () => {
			cancelAnimationFrame(raf);
			raf = 0;
			io.disconnect();
			ro.disconnect();
			mq.removeEventListener('change', onMq);
			document.removeEventListener('visibilitychange', onVis);
			// Free the GPU context straight away instead of waiting for GC.
			renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext();
			renderer = null;
		};
	});

	// Redraw when inputs change.
	$effect(() => {
		void version;
		void playing;
		void fullParams;
		void background;
		void scene;
		void board;
		kick();
	});
</script>

<canvas bind:this={canvas} class="block h-full w-full {klass}" aria-hidden="true"></canvas>
