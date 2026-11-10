# ANT — Adaptive Network of Trust (campaign website)

SvelteKit 3 · Svelte 5 · TypeScript · Tailwind CSS 4 · Three.js via Threlte 8. Static build (adapter-static).

```sh
npm install
npm run dev       # http://localhost:5173
npm run check     # svelte-check / TypeScript
npm run build     # static site in ./build
npm run preview
```

## Routes
- `/` — Home (hero), How it works, The Kit, Get involved
- `/resources` — printable materials (concept previews / coming soon, no downloads until real files exist)

## Where things live
| What | File |
|---|---|
| All copy and data | `src/lib/content.ts` |
| Brand tokens, font stack, buttons | `src/routes/layout.css` |
| Adobe Fonts link (`helvetica-neue-lt-pro`) | `src/app.html` |
| Supplied blob animation (unchanged copy) | `static/blobs-background.html` → `src/lib/components/BlobBackground.svelte` |
| Logos (supplied SVGs) | `static/brand/`, path data for 3D textures in `src/lib/brand/logo-paths.ts` |
| Network diagram | `src/lib/components/how/` |
| 3D kit (lazy-loaded) | `src/lib/components/kit/` — `KitSection` (HTML controls + panel), `KitViewer` (Canvas), `KitScene` (camera, lights, controls), `KitBox`, `KitObject` (item animation), `KitItemModel` (geometry), `textures.ts` (concept print textures) |

## Adding a real download
Put the file in `static/downloads/` and set `file: '/downloads/<name>.pdf'` on the matching entry in `resources` (`src/lib/content.ts`). The download button only appears when `file` is set.

## Notes
- The blob iframe is only mounted while the hero is near the viewport; the 3D viewer is only loaded/mounted while the kit section is near, and renders on demand.
- Without WebGL (or after a lost GPU context) the kit shows a 2D plan; all item content is always available in the HTML list.
- `prefers-reduced-motion`: the blob animation shows a still frame, and kit transitions jump instantly.
