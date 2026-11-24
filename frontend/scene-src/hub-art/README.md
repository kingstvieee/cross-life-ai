# hub-art: artwork bundled into the 3D portal hub

`scene-src/build.mjs` inlines these files into the offline runtime as `data:` URIs
(the runtime page's Content-Security-Policy only allows `data:` and `blob:` images).
Every file is optional:

- A portal without a card falls back to the procedural chrome arch.
- A missing or undecodable skyline falls back to the procedural night city.

## Portal cards

Source: branch `fix/portal-art-audit-20261123` @ `eadc368`, folder `frontend/scene-src/portal-art/`.

| Card | Portal (official name) | Source file | Source size | Source sha256 (first 16) | Card size | Card sha256 (first 16) |
|---|---|---|---|---|---|---|
| home.webp | STAAR Hub | home.png | 1402×1122 | 8f216554a136c4a4 | 512×374 | cc523170b1acc8ac |
| work.webp | STAAR Work | work.png | 1290×2796 | 344770cf6342ec73 | 512×475 | 8dfc6bd83a673f7d |
| creativity.webp | STAAR Dreams | creativity.png | 1290×2796 | a0de55ec5737f4c0 | 512×478 | 904c79d396508567 |
| wellbeing.webp | STAAR Health | wellbeing.png | 1290×2796 | ca9c4bf1f751805c | 512×475 | 47d666f90bb2426f |
| relationships.webp | STAAR Love | relationships.png | 1290×2796 | 908e2814641106b2 | 512×474 | 167e8738fe37637c |
| events.webp | STAAR Village | events.png | 1290×2796 | 19258c5b671a5413 | 512×476 | cd660a084d4ba9cd |
| style.webp | STAAR Closet | style.png | 444×420 | f4017093a22e610b | 415×314 | 398fd97da1fea429 |
| staarverse.webp | STARVERSE | staarverse.png | 1448×1086 | 8a3d802cf26afced | 512×387 | a7ffe94339099f7b |
| staarsonic.webp | STAARSONIC | staarsonic.png | 438×589 | 2978b84226c56b1c | 405×302 | beeaa9b171d7938e |
| diggitstaar.webp | DIGGITSTAAR | diggitstaar.png | 1290×1833 | 6544347f297c1193 | 512×379 | 78c0ac0728e1a652 |

Each card was made in four steps:

1. Cropped to the portal artwork's bounds, because several sources are full-screen phone captures.
2. Background removed to transparency.
3. Scaled down proportionally to at most 512 px wide. Cards are never stretched; the renderer sizes each card from its own aspect ratio.
4. Saved as WebP with straight (unpremultiplied) alpha.

## Skyline

| File | Use | Source | Source sha256 (first 16) | Output | Output sha256 (first 16) |
|---|---|---|---|---|---|
| toronto-skyline.jpg | `scene.background` of the hub | `frontend/assets/images/staarwardd/toronto-skyline-pan.png` (this branch) | 9564f886c0212aa8 | 1584×672 JPEG, same framing | fd51fd8d5b7da8f5 |

The renderer pins the photo's waterline to the 3D horizon. If you replace the photo, update
`HUB_SKYLINE` in `worlds.js`. It has three values:

- `waterline`: the waterline row, measured from the top as a fraction of the image height.
- `above`: how many degrees of photo sit above the waterline.
- `centre`: the horizontal framing.

## Open items before release

- The artwork on two cards does not match the official portal names:
  - `events.webp` reads **STAAR COMMUNITY**, but the portal is **STAAR Village**.
  - `style.webp` reads **STAAR STYLE**, but the portal is **STAAR Closet**.

  Either supply corrected art or approve these labels.
- The `style` and `staarsonic` sources are low resolution (under 450 px wide). They hold up at
  phone size but soften when focused, so supply higher-resolution masters.
