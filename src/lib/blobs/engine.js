// @ts-nocheck
/**
 * Blob field engine, ported verbatim from the supplied animation
 * (assets/animation/blobs-background.html): bridge geometry, motion model and
 * the WebGL2 renderer. Only the `export` list at the bottom is new; the logic
 * is unchanged so every scene renders exactly like the original.
 * Types live in engine.d.ts.
 */
// ---- field.js (bridge geometry) -------------------------------------------
// Core blob field, shared by the WebGL renderer (via packed pair data),
// the CPU evaluator (SVG export) and the tests.
//
// Every blob is a circle. Every pair of blobs within "reach" gets a bridge:
// a tapered, slightly bent capsule between the two circle surfaces whose
// thickness is a smooth function of the gap. Circles and bridges are merged
// with a cubic smooth-min, which produces the concave fillets.
//
// As two blobs move apart the neck thins to a hairline, pinches, and the two
// halves retract into their blobs before the pair leaves reach. Every
// quantity is continuous in blob position and size, so nothing ever pops.

const DEFAULT_PARAMS = Object.freeze({
  reach: 3.8,      // max gap before a bridge is gone, × average radius
  thickness: 0.4,  // neck half-width when blobs touch, × smaller radius
  flare: 0.36,     // bridge width where it enters a blob, × that blob's radius
  smooth: 0.5,     // fillet size, × smaller radius
  snap: 0.86,      // fraction of reach at which the neck pinches off
  taper: 3.0,      // profile exponent: higher = thin for longer, sharper flare
  organic: 0.55,   // per-bridge bend and neck asymmetry
  maxBridges: 12,  // most bridges one blob keeps at once; MAX_BRIDGES_OFF = no limit
  noOverlap: false, // bridges give way instead of crossing or merging into each other
});

const PARAM_RANGES = Object.freeze({
  reach: [0.5, 8, 0.05],
  thickness: [0.05, 1, 0.01],
  flare: [0.1, 0.7, 0.01],
  smooth: [0.05, 1.2, 0.01],
  snap: [0.3, 0.95, 0.01],
  taper: [1.2, 6, 0.05],
  organic: [0, 1, 0.01],
  maxBridges: [1, 12, 1],
});

/** Top of the maxBridges range: the cap is off. */
const MAX_BRIDGES_OFF = 12;

const LIMITS = Object.freeze({ maxBlobs: 128, maxPairs: 512 });

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Stable pseudo-random in [-1, 1] from two integer ids and a channel.
function hash3(a, b, c) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Fillet size used when merging a blob into the union. */
const blobK = (r, p) => Math.max(p.smooth * r * 0.5, 1e-3);

/**
 * Build the list of active bridges.
 * @param {{x:number,y:number,r:number,id:number}[]} blobs resolved (animated) blobs
 * @param {typeof DEFAULT_PARAMS} p
 */
function computePairs(blobs, p) {
  const cands = [];
  const n = Math.min(blobs.length, LIMITS.maxBlobs);
  for (let i = 0; i < n; i++) {
    const A0 = blobs[i];
    for (let j = i + 1; j < n; j++) {
      const B0 = blobs[j];
      // Order by id so a bridge's random traits never depend on list order.
      const swap = A0.id > B0.id;
      const A = swap ? B0 : A0;
      const B = swap ? A0 : B0;

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-3 || A.r <= 0.5 || B.r <= 0.5) continue;
      const gap = d - A.r - B.r;
      const reachDist = Math.max(p.reach * (A.r + B.r) * 0.5, 1e-3);
      if (gap >= reachDist) continue;
      // Nested circles: the bridge would be buried anyway.
      if (d + Math.min(A.r, B.r) < Math.max(A.r, B.r) * 0.98) continue;

      cands.push({
        A, B, ia: swap ? j : i, ib: swap ? i : j, d, gap,
        ux: dx / d, uy: dy / d,
        t: Math.max(gap, 0) / reachDist,
        g: gap / reachDist,
        sup: 0,
      });
    }
  }

  if (p.noOverlap && cands.length) suppressOverlaps(cands, blobs, n, p);
  const cap = Math.round(p.maxBridges ?? MAX_BRIDGES_OFF);
  if (cap < MAX_BRIDGES_OFF && cands.length) limitBridges(cands, n, cap);

  const pairs = [];
  for (const c of cands) {
    const t = c.sup > 0 ? suppressedT(c.t, c.sup, p.snap) : c.t;
    if (t >= 1) continue;
    pairs.push(buildPair(c, t, p));
    if (pairs.length >= LIMITS.maxPairs) break;
  }
  return pairs;
}

/**
 * Per-blob bridge cap. Each blob ranks its bridges by strength (shorter
 * relative gap = stronger) and lets go of those past its cap. The cut is
 * soft: a bridge's suppression is a smoothstep of how far it falls below the
 * cap-th strongest *other* bridge at that blob (an order statistic, so it is
 * continuous), and a pair yields if either end rejects it. When two bridges
 * swap rank they cross-fade instead of popping. A tiny per-pair bias from
 * hash3 settles exact ties (symmetric layouts) consistently.
 * Bridges already given up (by No overlap or by their other end) take a
 * slot less, so a blob can pick up its next strongest bridge instead.
 */
function limitBridges(cands, n, cap) {
  const W = 0.12; // half-width of the cross-fade, in units of reach
  const m = cands.length;
  const s = new Float64Array(m);
  const at = Array.from({ length: n }, () => []);
  for (let c = 0; c < m; c++) {
    const C = cands[c];
    s[c] = -C.g + hash3(C.A.id, C.B.id, 7) * W * 0.5;
    at[C.ia].push(c * 2);
    at[C.ib].push(c * 2 + 1);
  }
  let end = new Float64Array(m * 2); // suppression asked by each end
  const eff = new Float64Array(m * 2);
  // Freeing a slot moves a bridge by one cross-fade width at most; anything
  // stronger would make the feedback between ends steep enough to pop.
  for (let pass = 0; pass < 2; pass++) {
    for (let e = 0; e < m * 2; e++) {
      const c = e >> 1;
      eff[e] = s[c] - 2 * W * Math.max(cands[c].sup, end[e ^ 1]);
    }
    const next = new Float64Array(m * 2);
    for (const list of at) {
      if (list.length <= cap) continue;
      const vals = list.map((e) => eff[e]).sort((a, b) => b - a);
      for (const e of list) {
        // cap-th strongest among the others at this blob.
        const kth = eff[e] >= vals[cap - 1] ? vals[cap] : vals[cap - 1];
        next[e] = smoothstep(-W, W, kth - eff[e]);
      }
    }
    end = next;
  }
  for (let c = 0; c < m; c++) cands[c].sup = Math.max(cands[c].sup, end[c * 2], end[c * 2 + 1]);
}

/**
 * Suppression pushes a bridge along its own path: first it thins while
 * staying connected (so a composition that settles mid-way shows a thin
 * bridge, not thorns), and only in the last stretch pinches and retracts.
 */
function suppressedT(t, sup, snap) {
  const thin = Math.max(t, clamp(snap, 0.2, 0.97) * 0.97);
  const t1 = t + (thin - t) * smoothstep(0, 0.45, sup);
  return t1 + (1 - t1) * smoothstep(0.35, 1, sup);
}

/** Bridge geometry for a candidate at normalized gap t (0 = touching, 1 = gone). */
function buildPair(c, t, p) {
  const { A, B, d, gap, ux, uy } = c;
  const snap = clamp(p.snap, 0.2, 0.97);
  const minR = Math.min(A.r, B.r);
  const pinch = smoothstep(snap, 1, t); // 0 until the neck snaps, 1 at reach
  const life = 1 - pinch;

  // Neck half-width: thick when touching, hairline at the snap point,
  // negative afterwards (the bridge is split in the middle).
  const wMid = t < snap
    ? minR * p.thickness * Math.pow(1 - t / snap, 2)
    : -minR * 0.3 * pinch;
  // Past the snap the remains are pushed strictly outside the surface,
  // so a bridge leaving reach has zero visible contribution.
  const kill = Math.max(minR * 0.06, 2.5) * pinch;
  const w0 = A.r * p.flare * life - kill;
  const w1 = B.r * p.flare * life - kill;

  // Segment endpoints, inset into each circle so the flare grows out of it.
  let s0, s1;
  if (gap >= 0) { s0 = A.r; s1 = d - B.r; }
  else { s0 = s1 = (A.r + d - B.r) * 0.5; }
  s0 -= A.r * 0.32;
  s1 += B.r * 0.32;
  const x0 = A.x + ux * s0, y0 = A.y + uy * s0;
  const x1 = A.x + ux * s1, y1 = A.y + uy * s1;

  const bend = p.organic * 0.16 * hash3(A.id, B.id, 1);
  const neck = 0.5 + p.organic * 0.16 * hash3(A.id, B.id, 2);
  const k = Math.max(p.smooth * minR * (0.35 + 0.65 * life), 1e-3) * (1 - pinch * 0.999);

  const L = s1 - s0;
  const bound = L * 0.5 + Math.abs(bend) * L + Math.max(w0, w1, wMid, 0) + 1;

  // Approaching the snap, the profile turns from a long thread into a
  // localized pinch, so a breaking bridge never lingers as a hairline.
  const taper = p.taper + (Math.min(p.taper, 1.6) - p.taper) * smoothstep(snap * 0.5, snap, t);

  const Ls = Math.max(L, 1e-4);
  return {
    ia: c.ia, ib: c.ib,
    x0, y0, x1, y1, w0, w1, wMid, neck, bend, k, taper,
    cx: (x0 + x1) * 0.5, cy: (y0 + y1) * 0.5, bound,
    // Span of the segment that lies outside both blobs (for clearance tests).
    ta: Math.min((A.r * 0.32) / Ls, 0.5),
    tb: Math.max(1 - (B.r * 0.32) / Ls, 0.5),
  };
}

/** Bridge half-width at parameter tx along its segment. */
function profileAt(br, tx) {
  const m = br.neck;
  const u = tx < m ? (m - tx) / m : (tx - m) / (1 - m);
  const wEnd = tx < m ? br.w0 : br.w1;
  return br.wMid + (wEnd - br.wMid) * Math.pow(u, br.taper);
}

const SAMPLES = 9;

/** Centre-line samples [x, y, halfWidth] of the visible part of a bridge. */
function sampleBridge(br) {
  const out = new Float64Array(SAMPLES * 3);
  const bx = br.x1 - br.x0, by = br.y1 - br.y0;
  const L = Math.max(Math.hypot(bx, by), 1e-4);
  const ux = bx / L, uy = by / L;
  for (let s = 0; s < SAMPLES; s++) {
    const tx = br.ta + (br.tb - br.ta) * (s / (SAMPLES - 1));
    const off = br.bend * L * 4 * tx * (1 - tx);
    out[s * 3] = br.x0 + ux * tx * L - uy * off;
    out[s * 3 + 1] = br.y0 + uy * tx * L + ux * off;
    out[s * 3 + 2] = Math.max(profileAt(br, tx), 0);
  }
  return out;
}

/**
 * Bounding data for pruning clearance tests: per segment of the sampled
 * centre-line [midX, midY, halfLength, maxHalfWidth], then for the whole
 * bridge [centreX, centreY, radius, maxHalfWidth] in the last four slots.
 */
function sampleBounds(smp) {
  const segs = SAMPLES - 1;
  const out = new Float64Array(segs * 4 + 4);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxW = 0;
  for (let i = 0; i < segs; i++) {
    const ax = smp[i * 3], ay = smp[i * 3 + 1], bx = smp[i * 3 + 3], by = smp[i * 3 + 4];
    out[i * 4] = (ax + bx) * 0.5;
    out[i * 4 + 1] = (ay + by) * 0.5;
    out[i * 4 + 2] = Math.hypot(bx - ax, by - ay) * 0.5;
    out[i * 4 + 3] = Math.max(smp[i * 3 + 2], smp[i * 3 + 5]);
  }
  for (let s = 0; s < SAMPLES; s++) {
    const x = smp[s * 3], y = smp[s * 3 + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (smp[s * 3 + 2] > maxW) maxW = smp[s * 3 + 2];
  }
  const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
  let rad = 0;
  for (let s = 0; s < SAMPLES; s++) rad = Math.max(rad, Math.hypot(smp[s * 3] - cx, smp[s * 3 + 1] - cy));
  out[segs * 4] = cx; out[segs * 4 + 1] = cy; out[segs * 4 + 2] = rad; out[segs * 4 + 3] = maxW;
  return out;
}

// Pruning is only an optimization: a test is skipped when a lower bound
// proves it cannot change the result. The slack absorbs rounding.
const PRUNE_EPS = 1e-7;

/**
 * Extra clearance granted near blobs the bridges legitimately meet at:
 * bridges always join their own blobs, so closeness there is not an overlap.
 * Each root is { X, zone, w }; the allowance fades out gently (over twice
 * the zone) so nothing changes abruptly as a bridge leaves a root's area.
 */
function rootAllowance(x, y, roots) {
  let best = 0;
  for (const r of roots) {
    const e = Math.hypot(x - r.X.x, y - r.X.y) - r.X.r;
    const v = r.w * (r.zone * 2.5 + 10) * (1 - smoothstep(0, r.zone * 2, e));
    if (v > best) best = v;
  }
  return best;
}

/** 1 for the same blob or blobs merged together, fading to 0 as they part. */
function touching(E1, E2, p) {
  if (E1 === E2) return 1;
  const gap = Math.hypot(E1.x - E2.x, E1.y - E2.y) - E1.r - E2.r;
  return 1 - smoothstep(0, blobK(Math.min(E1.r, E2.r), p) + 4, gap);
}

// Closest points between segments AB and CD. Writes [distance, s, t] into SEG.
const SEG = [0, 0, 0];
function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy, wx = ax - cx, wy = ay - cy;
  const A = ux * ux + uy * uy, B = ux * vx + uy * vy, C = vx * vx + vy * vy;
  const D = ux * wx + uy * wy, E = vx * wx + vy * wy;
  const den = A * C - B * B;
  let sN, sD = den, tN, tD = den;
  if (den < 1e-9) { sN = 0; sD = 1; tN = E; tD = C; }
  else {
    sN = B * E - C * D; tN = A * E - B * D;
    if (sN < 0) { sN = 0; tN = E; tD = C; } else if (sN > sD) { sN = sD; tN = E + B; tD = C; }
  }
  if (tN < 0) { tN = 0; if (-D < 0) sN = 0; else if (-D > A) sN = sD; else { sN = -D; sD = A; } }
  else if (tN > tD) { tN = tD; if (-D + B < 0) sN = 0; else if (-D + B > A) sN = sD; else { sN = -D + B; sD = A; } }
  const sc = Math.abs(sN) < 1e-12 ? 0 : sN / (sD || 1e-12);
  const tc = Math.abs(tN) < 1e-12 ? 0 : tN / (tD || 1e-12);
  SEG[0] = Math.hypot(wx + sc * ux - tc * vx, wy + sc * uy - tc * vy);
  SEG[1] = sc; SEG[2] = tc;
  return SEG;
}

/**
 * Smallest gap between the surfaces of two sampled bridges (negative when
 * they interpenetrate), ignoring closeness around a shared root blob.
 */
let CLR_W = 0; // combined half-widths at the closest approach of the last call
/**
 * Lower bound of rootAllowance over each segment's bounding circle: the
 * allowance only shrinks with distance from a root, so evaluate it at the
 * farthest point the segment can reach.
 */
const ALLOW_P = new Float64Array(SAMPLES - 1), ALLOW_Q = new Float64Array(SAMPLES - 1);
function allowanceBounds(B, roots, out) {
  for (let i = 0; i < SAMPLES - 1; i++) {
    let best = 0;
    for (const r of roots) {
      const e = Math.hypot(B[i * 4] - r.X.x, B[i * 4 + 1] - r.X.y) + B[i * 4 + 2] - r.X.r;
      const v = r.w * (r.zone * 2.5 + 10) * (1 - smoothstep(0, r.zone * 2, e + PRUNE_EPS * (1 + Math.abs(e))));
      if (v > best) best = v;
    }
    out[i] = best;
  }
}

function bridgeClearance(P, Q, roots, PB, QB) {
  let best = Infinity;
  CLR_W = 0;
  const rooted = roots.length > 0;
  if (rooted) { allowanceBounds(PB, roots, ALLOW_P); allowanceBounds(QB, roots, ALLOW_Q); }
  for (let i = 0; i < SAMPLES - 1; i++) {
    const ax = P[i * 3], ay = P[i * 3 + 1], bx = P[i * 3 + 3], by = P[i * 3 + 4];
    for (let j = 0; j < SAMPLES - 1; j++) {
      // Segment distance >= centre distance - both half-lengths, plus the
      // smallest root allowance possible there. If that cannot beat best, skip.
      let lower = Math.hypot(PB[i * 4] - QB[j * 4], PB[i * 4 + 1] - QB[j * 4 + 1])
        - PB[i * 4 + 2] - QB[j * 4 + 2] - PB[i * 4 + 3] - QB[j * 4 + 3];
      if (rooted) lower += Math.min(ALLOW_P[i], ALLOW_Q[j]);
      if (lower - PRUNE_EPS * (1 + Math.abs(lower)) > best) continue;
      const cx = Q[j * 3], cy = Q[j * 3 + 1], dx = Q[j * 3 + 3], dy = Q[j * 3 + 4];
      segSeg(ax, ay, bx, by, cx, cy, dx, dy);
      const dist = SEG[0], sc = SEG[1], tc = SEG[2];
      const pr = P[i * 3 + 2] + (P[i * 3 + 5] - P[i * 3 + 2]) * sc;
      const qr = Q[j * 3 + 2] + (Q[j * 3 + 5] - Q[j * 3 + 2]) * tc;
      let c = dist - pr - qr;
      if (roots.length) {
        const px = ax + (bx - ax) * sc, py = ay + (by - ay) * sc;
        const qx = cx + (dx - cx) * tc, qy = cy + (dy - cy) * tc;
        c += Math.min(rootAllowance(px, py, roots), rootAllowance(qx, qy, roots));
      }
      if (c < best) { best = c; CLR_W = pr + qr; }
    }
  }
  return best;
}

/**
 * No-overlap mode. Gives every candidate a suppression amount in [0, 1]
 * when its bridge would touch another bridge or run into a third blob.
 * Every term is a smooth function of positions, so bridges give way
 * gracefully instead of popping. Between two bridges, the weaker one
 * (the relatively longer gap) yields.
 */
function suppressOverlaps(cands, blobs, n, p) {
  // Every candidate takes part (merged pairs included) so nothing switches abruptly.
  const live = cands;
  const m = live.length;
  if (!m) return;
  const geo = live.map((c) => {
    const br = buildPair(c, c.t, p);
    const smp = sampleBridge(br);
    return { br, smp, bounds: sampleBounds(smp), strength: 1 - c.t };
  });
  // Only real contact counts: the ramp starts just before surfaces would
  // visibly web together through the smooth-min fillet.
  const ramp = (clearance, margin) => 1 - smoothstep(margin, margin * 1.6 + 6, clearance);
  const rootZone = (br, X) => Math.max(br.w0, br.w1, 0) * 1.5 + br.k * 0.5 + X.r * 0.1;

  // Bridge vs third blob: the bridge always yields.
  const blobSup = new Float64Array(m);
  for (let a = 0; a < m; a++) {
    const c = live[a], { br, smp } = geo[a];
    let keep = 1;
    for (let i = 0; i < n; i++) {
      const C = blobs[i];
      if (C === c.A || C === c.B) continue;
      if (Math.hypot(C.x - br.cx, C.y - br.cy) > br.bound + C.r + br.k * 2 + 8) continue;
      // A blob merged with one of the bridge's own blobs is part of its root.
      const wC = 1 - Math.max(touching(C, c.A, p), touching(C, c.B, p));
      if (wC <= 0) continue;
      let best = Infinity;
      const roots = [{ X: c.A, zone: rootZone(br, c.A), w: 1 }, { X: c.B, zone: rootZone(br, c.B), w: 1 }];
      for (let s = 0; s < SAMPLES; s++) {
        const x = smp[s * 3], y = smp[s * 3 + 1];
        const g = Math.hypot(x - C.x, y - C.y) - C.r - smp[s * 3 + 2] + rootAllowance(x, y, roots);
        if (g < best) best = g;
      }
      keep *= 1 - wC * ramp(best, Math.max(br.k, blobK(C.r, p)) * 0.3 + 2);
    }
    blobSup[a] = 1 - keep;
  }

  // Bridge vs bridge.
  const over = new Float64Array(m * m);  // overlap amount, symmetric
  const prio = new Float64Array(m * m);  // how much [a] yields to [b]
  const cross = new Float64Array(m * m); // 0 = brushing side by side, 1 = passing through each other
  for (let a = 0; a < m; a++) {
    for (let b = a + 1; b < m; b++) {
      const P = geo[a], Q = geo[b];
      const far = P.br.bound + Q.br.bound + Math.max(P.br.k, Q.br.k) * 2 + 8;
      if (Math.hypot(P.br.cx - Q.br.cx, P.br.cy - Q.br.cy) > far) continue;
      // Clearance can only be at or past the end of the ramp: overlap is 0.
      const margin = Math.max(P.br.k, Q.br.k) * 0.3 + 2;
      const S = (SAMPLES - 1) * 4, PB = P.bounds, QB = Q.bounds;
      const lower = Math.hypot(PB[S] - QB[S], PB[S + 1] - QB[S + 1]) - PB[S + 2] - QB[S + 2] - PB[S + 3] - QB[S + 3];
      if (lower - PRUNE_EPS * (1 + Math.abs(lower)) > margin * 1.6 + 6) continue;
      const ca = live[a], cb = live[b];
      // Shared blobs, and ends on blobs merged with each other, are roots
      // where the two bridges may meet.
      const roots = [];
      for (const E1 of [ca.A, ca.B]) for (const E2 of [cb.A, cb.B]) {
        const w = touching(E1, E2, p);
        if (w <= 0) continue;
        for (const X of E1 === E2 ? [E1] : [E1, E2]) {
          roots.push({ X, zone: Math.max(rootZone(P.br, X), rootZone(Q.br, X)), w });
        }
      }
      const clearance = bridgeClearance(P.smp, Q.smp, roots, P.bounds, Q.bounds);
      const o = ramp(clearance, margin);
      if (o <= 0) continue;
      over[a * m + b] = over[b * m + a] = o;
      // How deeply the two interpenetrate. A real crossing removes both
      // bridges unless one is clearly stronger; brushing only moves the weaker.
      // At a true crossing the clearance is exactly -(both half-widths).
      const cr = smoothstep(0.3, 0.9, -clearance / Math.max(CLR_W, 1));
      cross[a * m + b] = cross[b * m + a] = cr;
      const win = 0.15 + 0.3 * cr;
      const y = smoothstep(-win, win, Q.strength - P.strength);
      prio[a * m + b] = y;
      prio[b * m + a] = 1 - y;
    }
  }

  // Relaxation passes: a bridge that is itself giving way pushes others less.
  let sup = Float64Array.from(blobSup);
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float64Array(m);
    for (let a = 0; a < m; a++) {
      let keep = 1 - blobSup[a];
      for (let b = 0; b < m; b++) {
        const o = over[a * m + b];
        if (!o) continue;
        // A bridge that is itself giving way pushes others less, except at a
        // crossing, where both are meant to go.
        const att = 1 - sup[b] * (1 - cross[a * m + b]);
        keep *= 1 - Math.min(1, o * prio[a * m + b] * (2 + 2 * cross[a * m + b])) * att;
      }
      next[a] = 1 - keep;
    }
    sup = next;
  }
  for (let a = 0; a < m; a++) live[a].sup = sup[a];
}

/** Signed distance estimate from (px,py) to a bridge. Writes t-along into out[1]. */
function bridgeDist(px, py, br, out) {
  const bx = br.x1 - br.x0;
  const by = br.y1 - br.y0;
  const L = Math.max(Math.hypot(bx, by), 1e-4);
  const ux = bx / L, uy = by / L;
  const rx = px - br.x0, ry = py - br.y0;
  const x = rx * ux + ry * uy;
  let y = -rx * uy + ry * ux;
  const tx = clamp(x / L, 0, 1);
  y -= br.bend * L * 4 * tx * (1 - tx);
  const m = br.neck;
  let u, wEnd;
  if (tx < m) { u = (m - tx) / m; wEnd = br.w0; }
  else { u = (tx - m) / (1 - m); wEnd = br.w1; }
  const r = br.wMid + (wEnd - br.wMid) * Math.pow(u, br.taper);
  const q = Math.hypot(x - tx * L, y);
  if (out) out[1] = tx;
  return q - r;
}

// Colours change over a narrower band than the shape fillet, so junctions
// between differently coloured blobs stay clean instead of muddy.
const COLOR_BAND = 0.3;

/** Where along a bridge the colour switches from blob A to blob B. */
const bridgeColorT = (tx, neck) => smoothstep(neck - 0.2, neck + 0.2, tx);

// Cubic smooth-min: returns min, writes blend-toward-b into s.w
const S = { w: 0 };
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  S.w = clamp(0.5 + 0.5 * (a - b) / (k * COLOR_BAND), 0, 1);
  return Math.min(a, b) - h * h * h * k * (1 / 6);
}

const tmp = [0, 0];

/** Signed distance estimate of the whole composition (negative = inside). */
function evalField(px, py, blobs, pairs, p) {
  let d = 1e9;
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const k = blobK(b.r, p);
    const di = Math.hypot(px - b.x, py - b.y) - b.r;
    if (di > d + k) continue;
    d = smin(d, di, k);
  }
  for (let i = 0; i < pairs.length; i++) {
    const br = pairs[i];
    if (Math.hypot(px - br.cx, py - br.cy) - br.bound > d + br.k) continue;
    d = smin(d, bridgeDist(px, py, br, null), br.k);
  }
  return d;
}

/**
 * Field plus per-colour ownership weights (used for multi-colour SVG).
 * @param {Int32Array|number[]} colorIndex colour slot of each blob
 * @param {Float32Array} w output weights, length = number of colour slots
 */
function evalFieldWeights(px, py, blobs, pairs, p, colorIndex, w) {
  const nc = w.length;
  w.fill(0);
  let d = 1e9;
  let first = true;
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const k = blobK(b.r, p);
    const di = Math.hypot(px - b.x, py - b.y) - b.r;
    if (!first && di > d + k) continue;
    d = smin(d, di, k);
    const s = first ? 1 : S.w;
    first = false;
    for (let c = 0; c < nc; c++) w[c] *= 1 - s;
    w[colorIndex[i]] += s;
  }
  for (let i = 0; i < pairs.length; i++) {
    const br = pairs[i];
    if (Math.hypot(px - br.cx, py - br.cy) - br.bound > d + br.k) continue;
    const bd = bridgeDist(px, py, br, tmp);
    d = smin(d, bd, br.k);
    const s = S.w;
    if (s <= 0) continue;
    const tx = bridgeColorT(tmp[1], br.neck);
    for (let c = 0; c < nc; c++) w[c] *= 1 - s;
    w[colorIndex[br.ia]] += s * (1 - tx);
    w[colorIndex[br.ib]] += s * tx;
  }
  return d;
}

// ---- model.js: motion ------------------------------------------------------
const TAU = Math.PI * 2;

/**
 * Resolve a blob at time `time` (seconds). Every motion is periodic in
 * doc.loop, so recorded videos loop seamlessly.
 */
function resolveBlob(b, time, loop, out) {
  const m = b.motion;
  const ph = (time / loop) * m.cycles + m.phase;
  const a = ph * TAU;
  let x = b.x, y = b.y;
  switch (m.type) {
    case 'drift': {
      // Two incommensurate-looking but loop-periodic harmonics per axis.
      const s1 = hash3(b.id, 7, 1) * Math.PI, s2 = hash3(b.id, 7, 2) * Math.PI;
      const s3 = hash3(b.id, 7, 3) * Math.PI, s4 = hash3(b.id, 7, 4) * Math.PI;
      x += m.amp * (0.65 * Math.sin(a + s1) + 0.35 * Math.sin(2 * a + s2));
      y += m.amp * (0.65 * Math.cos(a + s3) + 0.35 * Math.sin(3 * a + s4)) * 0.85;
      break;
    }
    case 'orbit': {
      const dir = m.angle < 0 ? -1 : 1;
      x += m.amp * Math.cos(dir * a);
      y += m.amp * Math.sin(dir * a);
      break;
    }
    case 'swing': {
      const ang = (m.angle * Math.PI) / 180;
      const s = Math.sin(a);
      x += m.amp * s * Math.cos(ang);
      y += m.amp * s * Math.sin(ang);
      break;
    }
    default: break;
  }
  let r = b.r;
  if (m.pulse > 0) r *= 1 + m.pulse * Math.sin(a + 1.3);
  out.id = b.id; out.x = x; out.y = y; out.r = r;
  return out;
}


// ---- renderer.js (WebGL2) ---------------------------------------------------
// WebGL2 renderer: evaluates the same field as field.js per pixel.

// Width of the tile-list texture (a power of two: the shader uses shifts).
const LIST_W = 2048;

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uData;
uniform highp usampler2D uTiles; // per tile: list offset, blob count | pair count << 16
uniform highp usampler2D uList;  // concatenated per-tile item indices
uniform int uTiled;              // 0 = every pixel visits every item
uniform int uTileSize;           // device px, even so 2x2 derivative quads never straddle tiles
uniform int uBlobCount;
uniform int uPairCount;
uniform float uCanvasH;
uniform float uScale;      // device px per artboard unit
uniform vec2 uOffset;      // device px of artboard origin
uniform vec2 uBoard;       // artboard size in units
uniform vec3 uBg;
uniform vec3 uStage;
uniform float uTransparent; // 1 = transparent background
uniform float uChecker;     // 1 = show checkerboard for transparent bg (editor only)
uniform float uClip;        // 1 = draw stage outside the artboard

out vec4 outColor;

const int PAIR_ROW = ${LIMITS.maxBlobs};

vec4 fetch(int row, int col) { return texelFetch(uData, ivec2(col, row), 0); }
int listAt(int n) { return int(texelFetch(uList, ivec2(n & ${LIST_W - 1}, n >> ${Math.log2(LIST_W)}), 0).r); }

float sminw(float a, float b, float k, out float w) {
  float h = max(k - abs(a - b), 0.0) / k;
  w = clamp(0.5 + 0.5 * (a - b) / (k * ${COLOR_BAND.toFixed(3)}), 0.0, 1.0);
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uCanvasH - gl_FragCoord.y);
  vec2 p = (frag - uOffset) / uScale;

  float d = 1e9;
  vec3 col = vec3(0.0);
  bool first = true;

  // Tile lists only leave out items this loop would skip at every pixel of
  // the tile anyway, in the same order, so the result is identical.
  int nBlobs = uBlobCount, nPairs = uPairCount, off = 0;
  if (uTiled == 1) {
    uvec2 h = texelFetch(uTiles, ivec2(gl_FragCoord.xy) / uTileSize, 0).xy;
    off = int(h.x);
    nBlobs = int(h.y & 0xffffu);
    nPairs = int(h.y >> 16);
  }

  for (int n = 0; n < ${LIMITS.maxBlobs}; n++) {
    if (n >= nBlobs) break;
    int i = uTiled == 1 ? listAt(off + n) : n;
    vec4 b = fetch(i, 0);
    float di = length(p - b.xy) - b.z;
    float k = b.w;
    if (!first && di > d + k) continue;
    float w;
    d = sminw(d, di, k, w);
    vec3 c = fetch(i, 1).rgb;
    col = first ? c : mix(col, c, w);
    first = false;
  }

  for (int n = 0; n < ${LIMITS.maxPairs}; n++) {
    if (n >= nPairs) break;
    int row = PAIR_ROW + (uTiled == 1 ? listAt(off + nBlobs + n) : n);
    vec4 t3 = fetch(row, 3);   // cx, cy, bound, ib
    float k = fetch(row, 2).y;
    if (length(p - t3.xy) - t3.z > d + k) continue;
    vec4 t0 = fetch(row, 0);   // x0 y0 x1 y1
    vec4 t1 = fetch(row, 1);   // w0 w1 wMid neck
    vec4 t2 = fetch(row, 2);   // bend k taper ia
    vec2 ba = t0.zw - t0.xy;
    float L = max(length(ba), 1e-4);
    vec2 u = ba / L;
    vec2 r = p - t0.xy;
    float x = dot(r, u);
    float y = -r.x * u.y + r.y * u.x;
    float tx = clamp(x / L, 0.0, 1.0);
    y -= t2.x * L * 4.0 * tx * (1.0 - tx);
    float m = t1.w;
    float uu = tx < m ? (m - tx) / m : (tx - m) / (1.0 - m);
    float wEnd = tx < m ? t1.x : t1.y;
    float rad = t1.z + (wEnd - t1.z) * pow(uu, t2.z);
    float bd = length(vec2(x - tx * L, y)) - rad;
    float w;
    d = sminw(d, bd, k, w);
    vec3 ca = fetch(int(t2.w), 1).rgb;
    vec3 cb = fetch(int(t3.w), 1).rgb;
    col = mix(col, mix(ca, cb, smoothstep(m - 0.2, m + 0.2, tx)), w);
  }

  // Anti-aliasing from the actual screen-space gradient of the field.
  float g = length(vec2(dFdx(d), dFdy(d)));
  g = clamp(g, 0.25 / uScale, 4.0 / uScale);
  float cov = clamp(0.5 - d / g, 0.0, 1.0);

  // Artboard mask (crisp, pixel aligned).
  vec2 q = min(p, uBoard - p) * uScale;
  float inBoard = clamp(min(q.x, q.y) + 0.5, 0.0, 1.0);
  if (uClip < 0.5) inBoard = 1.0;
  cov *= inBoard;

  vec3 bg = uBg;
  float bgA = 1.0 - uTransparent;
  if (uTransparent > 0.5 && uChecker > 0.5) {
    vec2 cell = floor(frag / 10.0);
    float ck = mod(cell.x + cell.y, 2.0);
    bg = mix(vec3(0.86), vec3(0.74), ck);
    bgA = 1.0;
  }
  // Composite blob over background (straight alpha output).
  float a = cov + bgA * (1.0 - cov);
  vec3 rgb = a > 0.0 ? (col * cov + bg * bgA * (1.0 - cov)) / a : vec3(0.0);
  vec4 board = vec4(rgb, a);
  outColor = mix(vec4(uStage, uClip > 0.5 ? 1.0 : 0.0), board, inBoard);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('Shader compile failed: ' + log);
  }
  return s;
}

function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0];
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const UNIFORMS = ['uData', 'uTiles', 'uList', 'uTiled', 'uTileSize', 'uBlobCount', 'uPairCount', 'uCanvasH', 'uScale', 'uOffset', 'uBoard', 'uBg', 'uStage', 'uTransparent', 'uChecker', 'uClip'];

/** Aim for about this many tiles: enough to cull well, few enough to build fast. */
const TARGET_TILES = 2400;

class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{preserve?: boolean, skipUnchanged?: boolean}} [opts]
   *   skipUnchanged: leave the canvas as it is when a frame is identical to the
   *   last one drawn (editor only: recording needs every frame drawn).
   */
  constructor(canvas, { preserve = false, skipUnchanged = false } = {}) {
    this.canvas = canvas;
    this.skipUnchanged = skipUnchanged;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: preserve,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.lost = false;
    /** Set false to make every pixel visit every item (for comparisons). */
    this.tiling = true;
    /** Counts and timings of the last frame, for profiling. */
    this.stats = { drawn: false, tiles: 0, listLength: 0, tileMs: 0 };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this._init(); });
    this._init();
  }

  _init() {
    const gl = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'aPos');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader link failed: ' + gl.getProgramInfoLog(prog));
    }
    this.prog = prog;
    this.u = {};
    for (const name of UNIFORMS) this.u[name] = gl.getUniformLocation(prog, name);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.vao = vao;

    this.rows = LIMITS.maxBlobs + LIMITS.maxPairs;
    this.data = new Float32Array(this.rows * 4 * 4);
    this.tex = this._texture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, this.rows, 0, gl.RGBA, gl.FLOAT, this.data);

    this.tileTex = this._texture();
    this.tileDims = [0, 0];
    this.tileSize = 16;
    this.listTex = this._texture();
    this.listRows = 0;
    this.maxListRows = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 4096);
    this.list = new Uint16Array(LIST_W * 16);
    this.header = new Uint32Array(0);
    this.last = null; // the last drawn frame, for skipUnchanged
  }

  _texture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  /**
   * Builds the per-tile item lists. An item is left out of a tile only when
   * the shader's own early-out would skip it at every pixel of that tile:
   *  - blob i: its nearest distance over the tile exceeds the farthest
   *    distance of some earlier blob plus its fillet k (the running field
   *    value is never above any earlier blob's distance);
   *  - bridge: its bounding-circle distance exceeds the farthest distance of
   *    any blob plus its k.
   * Order is kept, so every pixel does exactly the same arithmetic as
   * without tiles. Tiles wholly outside a clipped artboard get no items:
   * those pixels show the stage colour whatever the field is.
   * Returns the list length, or -1 when the lists would not fit.
   */
  _buildTiles(nb, np, view, board, W, H, clip) {
    const T = Math.max(16, 2 * Math.ceil(Math.sqrt((W * H) / TARGET_TILES) / 2));
    const cols = Math.ceil(W / T), rows = Math.ceil(H / T);
    const D = this.data;
    const s = view.scale, ox = view.ox, oy = view.oy;
    const pad = 1 / s; // one device pixel of slack around each tile
    const base = LIMITS.maxBlobs * 16;
    if (this.header.length < cols * rows * 2) this.header = new Uint32Array(cols * rows * 2);
    const header = this.header;
    const cap = LIST_W * this.maxListRows;
    let list = this.list;
    let len = 0;
    const outX0 = -0.5 / s, outX1 = board.w + 0.5 / s, outY0 = -0.5 / s, outY1 = board.h + 0.5 / s;

    for (let ty = 0; ty < rows; ty++) {
      // Tile rows follow gl_FragCoord (bottom-up); frag y is top-down.
      const y0 = (H - (ty + 1) * T - oy) / s - pad;
      const y1 = (H - ty * T - oy) / s + pad;
      for (let tx = 0; tx < cols; tx++) {
        const x0 = (tx * T - ox) / s - pad;
        const x1 = ((tx + 1) * T - ox) / s + pad;
        const h = (ty * cols + tx) * 2;
        header[h] = len;
        if (clip && (x1 < outX0 || x0 > outX1 || y1 < outY0 || y0 > outY1)) { header[h + 1] = 0; continue; }
        if (len + nb + np > cap) return -1; // would not fit the texture: draw untiled
        if (len + nb + np > list.length) {
          const grown = new Uint16Array(Math.min(cap, Math.max(list.length * 2, len + nb + np)));
          grown.set(list.subarray(0, len));
          list = this.list = grown;
        }
        let ub = Infinity, kb = 0;
        for (let i = 0; i < nb; i++) {
          const o = i * 16;
          const bx = D[o], by = D[o + 1], r = D[o + 2], k = D[o + 3];
          const ex = bx < x0 ? x0 - bx : bx > x1 ? bx - x1 : 0;
          const ey = by < y0 ? y0 - by : by > y1 ? by - y1 : 0;
          const lb = Math.sqrt(ex * ex + ey * ey) - r;
          if (i === 0 || lb <= ub + k + tol(lb, ub, k)) { list[len++] = i; kb++; }
          const fx = Math.max(Math.abs(bx - x0), Math.abs(bx - x1));
          const fy = Math.max(Math.abs(by - y0), Math.abs(by - y1));
          const far = Math.sqrt(fx * fx + fy * fy) - r;
          if (far < ub) ub = far;
        }
        let kp = 0;
        for (let j = 0; j < np; j++) {
          const o = base + j * 16;
          const cx = D[o + 12], cy = D[o + 13], bound = D[o + 14], k = D[o + 9];
          const ex = cx < x0 ? x0 - cx : cx > x1 ? cx - x1 : 0;
          const ey = cy < y0 ? y0 - cy : cy > y1 ? cy - y1 : 0;
          const lb = Math.sqrt(ex * ex + ey * ey) - bound;
          if (lb <= ub + k + tol(lb, ub, k)) { list[len++] = j; kp++; }
        }
        header[h + 1] = kb | (kp << 16);
      }
    }

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex);
    if (this.tileDims[0] !== cols || this.tileDims[1] !== rows) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32UI, cols, rows, 0, gl.RG_INTEGER, gl.UNSIGNED_INT, header, 0);
      this.tileDims = [cols, rows];
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RG_INTEGER, gl.UNSIGNED_INT, header, 0);
    }
    const usedRows = Math.max(1, Math.ceil(len / LIST_W));
    if (list.length < usedRows * LIST_W) {
      const grown = new Uint16Array(usedRows * LIST_W);
      grown.set(list.subarray(0, len));
      list = this.list = grown;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.listTex);
    if (usedRows > this.listRows) {
      this.listRows = Math.min(this.maxListRows, Math.max(usedRows, this.listRows * 2, 16));
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, LIST_W, this.listRows, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, null);
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LIST_W, usedRows, gl.RED_INTEGER, gl.UNSIGNED_SHORT, list, 0);
    this.stats.tiles = cols * rows;
    this.tileSize = T;
    return len;
  }

  /**
   * @param {object} frame
   * @param {{x,y,r,rgb}[]} frame.blobs
   * @param {object[]} frame.pairs from computePairs
   * @param {object} frame.params
   * @param {{scale:number, ox:number, oy:number}} frame.view device-pixel transform
   * @param {{w:number,h:number}} frame.board
   * @returns {boolean} whether anything was drawn
   */
  render(frame) {
    if (this.lost) return false;
    const gl = this.gl;
    const { blobs, pairs, params, view, board } = frame;
    const nb = Math.min(blobs.length, LIMITS.maxBlobs);
    const np = Math.min(pairs.length, LIMITS.maxPairs);
    const D = this.data;

    for (let i = 0; i < nb; i++) {
      const b = blobs[i];
      const o = i * 16;
      D[o] = b.x; D[o + 1] = b.y; D[o + 2] = b.r; D[o + 3] = blobK(b.r, params);
      D[o + 4] = b.rgb[0]; D[o + 5] = b.rgb[1]; D[o + 6] = b.rgb[2]; D[o + 7] = 1;
    }
    const base = LIMITS.maxBlobs * 16;
    for (let j = 0; j < np; j++) {
      const p = pairs[j];
      const o = base + j * 16;
      D[o] = p.x0; D[o + 1] = p.y0; D[o + 2] = p.x1; D[o + 3] = p.y1;
      D[o + 4] = p.w0; D[o + 5] = p.w1; D[o + 6] = p.wMid; D[o + 7] = p.neck;
      D[o + 8] = p.bend; D[o + 9] = p.k; D[o + 10] = p.taper; D[o + 11] = p.ia;
      D[o + 12] = p.cx; D[o + 13] = p.cy; D[o + 14] = p.bound; D[o + 15] = p.ib;
    }

    const W = this.canvas.width, H = this.canvas.height;
    const bg = hexToRgb(frame.background);
    const st = hexToRgb(frame.stage || '#0f0f10');
    const clip = frame.clip !== false;
    const sig = [W, H, nb, np, view.scale, view.ox, view.oy, board.w, board.h, ...bg, ...st,
      frame.transparent ? 1 : 0, frame.checker ? 1 : 0, clip ? 1 : 0, this.tiling ? 1 : 0];
    if (this.skipUnchanged && this.last && sameFrame(this.last, sig, D, nb, np)) {
      this.stats.drawn = false;
      return false;
    }

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (nb > 0) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, nb, gl.RGBA, gl.FLOAT, D, 0);
    if (np > 0) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, LIMITS.maxBlobs, 4, np, gl.RGBA, gl.FLOAT, D, base);

    const t0 = performance.now();
    const len = this.tiling ? this._buildTiles(nb, np, view, board, W, H, clip) : -1;
    this.stats.tileMs = performance.now() - t0;
    this.stats.listLength = Math.max(len, 0);
    const tiled = len >= 0;

    gl.viewport(0, 0, W, H);
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.listTex);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(this.u.uData, 0);
    gl.uniform1i(this.u.uTiles, 1);
    gl.uniform1i(this.u.uList, 2);
    gl.uniform1i(this.u.uTiled, tiled ? 1 : 0);
    gl.uniform1i(this.u.uTileSize, tiled ? this.tileSize : 1);
    gl.uniform1i(this.u.uBlobCount, nb);
    gl.uniform1i(this.u.uPairCount, np);
    gl.uniform1f(this.u.uCanvasH, H);
    gl.uniform1f(this.u.uScale, view.scale);
    gl.uniform2f(this.u.uOffset, view.ox, view.oy);
    gl.uniform2f(this.u.uBoard, board.w, board.h);
    gl.uniform3f(this.u.uBg, bg[0], bg[1], bg[2]);
    gl.uniform3f(this.u.uStage, st[0], st[1], st[2]);
    gl.uniform1f(this.u.uTransparent, frame.transparent ? 1 : 0);
    gl.uniform1f(this.u.uChecker, frame.checker ? 1 : 0);
    gl.uniform1f(this.u.uClip, clip ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (this.skipUnchanged) this.last = remember(this.last, sig, D);
    this.stats.drawn = true;
    return true;
  }

  /** Forget the last frame, so the next render always draws. */
  invalidate() { this.last = null; }
}

/** Float32 slack for the culling comparisons (culling less is always safe). */
function tol(a, b, k) {
  return 1e-3 + 2e-5 * (Math.abs(a) + (b === Infinity ? 0 : Math.abs(b)) + k);
}

function sameFrame(last, sig, D, nb, np) {
  if (last.sig.length !== sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (last.sig[i] !== sig[i]) return false;
  const base = LIMITS.maxBlobs * 16;
  for (let i = 0, n = nb * 16; i < n; i++) if (last.data[i] !== D[i]) return false;
  for (let i = base, n = base + np * 16; i < n; i++) if (last.data[i] !== D[i]) return false;
  return true;
}

function remember(last, sig, D) {
  const data = last?.data || new Float32Array(D.length);
  data.set(D);
  return { sig, data };
}

export { DEFAULT_PARAMS, LIMITS, computePairs, resolveBlob, hexToRgb, Renderer };
