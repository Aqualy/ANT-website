# `/explore` plan: ANT as a 3D infographic

One low-poly paper diorama of a neighbourhood. The camera glides between nine authored poses, objects animate in place, and a real-HTML panel carries the copy.

## Chapters

| # | Hash | Shows | Camera idea |
|---|---|---|---|
| 0 | `#intro` | Houses on green blob islands, bridged into a network around the local Blob | Wide three-quarter view of the whole neighbourhood |
| 1 | `#kit` | Blackout Communication Kit opens beside Noor's house, six item cards fan out | Low, close, from the south |
| 2 | `#profile` | Paper profile fills in: picture, name, story, three interest tokens fly over from the sticker sheet, "+ fixing radios" | Same spot, slightly tighter |
| 3 | `#blob` | Noor walks to the Blob kiosk (two operators), hands the profile in, Public / Private chips | Front view of the kiosk |
| 4 | `#public` | Booklet leaf turns to Sam and Noor, blob chain grows between their gardening tokens | Close on the booklet lectern |
| 5 | `#private` | Covered profile, Sam's request slip waits at the Blob, Noor visits, accepts, cover opens | Front view, Sam left, card right |
| 6 | `#symbols` | Form is drawn, flies into the empty cell of the symbol board, then pins appear on the streets | Close on the board, then pulls back to include the pins |
| 7 | `#further` | Blob chains carry profile copies to three other Blobs, then fibre cables with light pulses | High, wide view of all four Blobs |
| 8 | `#outro` | Green spreads over the ground, the network turns black on green | Near top-down |

## World API (`src/lib/components/world/`)

The world knows nothing about chapters. It is driven by one plain object of numbers.

- `createWorld(): World` builds the whole diorama in code.
  - `world.group`: the Three group to mount.
  - `world.apply(state: WorldState)`: poses every object and repaints only the textures whose inputs changed.
  - `world.anchors`: named `Vector3`s (Blob, operators, Noor, Sam, booklet, board, pins) for labels or gameplay.
  - `world.billboards`: objects the host turns toward the camera.
  - `world.dispose()`: frees geometries, materials, textures and the blob context.
- `WorldState` (`state.ts`): about 30 channels, mostly 0..1 (`network`, `kitOpen`, `pTokens`, `walkNoor`, `flip`, `match`, `cover`, `fibre`, ...). `restState()` is all zeros.
- `blobHost.ts`: one shared offscreen engine `Renderer`; each surface (ground, booklet spread) copies its frame into a `CanvasTexture` and skips the work when its blobs have not changed.
- `prints.ts`, `pictos.ts`: 2D-canvas painters for paper (profiles, kit cards, signage, board, form), ported from the video's parts.
- `layout.ts`: every position in one place.

Chapter logic lives in `src/lib/components/explore/`: `chapters.ts` (one typed array: copy, camera, labels, `targets(t, ui)`), `ExploreScene.svelte` (damps the state toward the chapter's targets, moves the camera, projects HTML labels), `ExploreViewer.svelte` (canvas, context loss), `ExploreFallback.svelte` (2D diagrams).

## Motion model

Each chapter gives target values as a function of chapter-local time. "Next" plays that choreography; a jump (dots, keys Home/End, deep link, Previous) uses the settled targets, so the state converges without replaying. Values are damped toward their targets, so interrupting at any moment is safe. Reduced motion snaps state and camera. When nothing moves the task stops and nothing renders.

## Risks

- **WebGL contexts**: Three plus the blob engine is two contexts. Mitigation: one shared engine renderer, freed on unmount.
- **Blob texture cost**: the ground texture is large. Mitigation: re-render only when blobs change; cap at about 1920 px.
- **Label collisions**: HTML labels are projected from 3D. Mitigation: few labels per chapter, checked in screenshots at both sizes.
- **Portrait framing**: poses are fitted to a subject box per aspect ratio, so phones pull back rather than crop.
- **Palette under lighting**: paper and blobs use unlit materials (exact values); only white volumes are shaded, with white light and no tone mapping.
- **Idle when settled**: fibre pulses run for a few seconds and then rest, instead of looping forever.
- **Wheel navigation**: one gesture per chapter needs inertia filtering; at the first and last chapter the wheel scrolls the page normally.
