# STAARWAARDD — Builds 174–180 production-path evidence

**Development code milestones: implemented, subject to latest CI. Final approved app: NOT COMPLETE.**
Review base: `guardian/build-174-verified-rig-import` (draft PR #107).
Review branch: `release/build-175-180-model-and-world-gates`.

## Completed code items
- **174:** Optional offline armoured Guardian skinned GLB import from `frontend/scene-src/assets/guardian-armored-rig.glb`, exact approved PNG SHA-256 `d7f18158a91778a7f3ce97c7326b1c75afefdc792c77ab02c4fead0e3ffa659c`, 16 face targets and founder evidence receipt. No real production Guardian GLB exists in the branch; no model is substituted.
- **175:** Separate acceptance contract for each of nine locked worlds plus both Love variants; requires distinct review receipts and actual iPhone capture identifiers.
- **176:** All-or-none production world GLB packer in the offline Three.js generator. A partial art delivery fails compilation; an entirely absent delivery retains navigation-safe preview scenes.
- **177:** 3D world runtime can swap preview geometry for only a verified GLB, retaining text/navigation fallback and returning to preview on failed import.
- **178:** Test coverage for all ten required scene variants, wrong-world receipts, rejected rights, absent files, duplicate models and fallback navigation.
- **179:** Enforce embedded GLB geometry, mesh vertex accessors and aggregate mobile delivery limit; reject remote asset references or unsupported decoder requirements.
- **180:** Add complete world-asset regression suite to Guardian Release Gates; keep final production sign-off blocked until founder-approved model and native evidence actually exist.

## Required accepted 3D world deliveries

Under `frontend/scene-src/assets/worlds/` deliver each paired `<id>-<variant>.glb` and `<id>-<variant>.json`:

| World | Production asset key | Founder-locked concept |
|---|---|---|
| Home | `home-residence` | Cinematic residence, rooms and smart devices |
| Work | `work-command` | Bright Toronto command centre, Earth console |
| Dreams | `creativity-dream` | Floating dream world, waterfalls, trees |
| Health | `wellbeing-health` | Yonge–Dundas / Eaton Centre medical street world |
| Love | `relationships-realm` | Ruby-and-champagne Relationship Realm |
| Love Singles | `relationships-singles` | Obsidian Singles Lounge and circular fire |
| Village | `events-village` | Scotiabank Arena, CN Tower and GTA |
| Closet | `style-closet` | Character-free chrome and crystal RSF boutique |
| STARVERSE | `staarverse-universe` | Star gateway, islands, games library |
| STAARSONIC | `staarsonic-studio` | Chrome music studio and Toronto skyline |

Every receipt requires schema `staar-world-asset-v1`, correct `worldId`, `variant`, independently checked model SHA256, distinct asset ID, export rights confirmation, founder visual approval, real device capture evidence, animation verification and navigation verification. Merely writing `true` in JSON is not independent verification of visual resemblance or actual device quality; the reviewer must see evidence.

Example non-deployable receipt:
```json
{
  "schema": "staar-world-asset-v1",
  "worldId": "home",
  "variant": "residence",
  "assetId": "home-residence-reviewed",
  "modelSha256": "REPLACE_WITH_ACTUAL_64_CHARACTER_HASH",
  "designEvidenceId": "REPLACE_WITH_ACTUAL_REVIEW_ID",
  "actualDeviceCaptureId": "REPLACE_WITH_ACTUAL_CAPTURE_ID",
  "founderVisualApproved": false,
  "deviceCaptureVerified": false,
  "animationVerified": false,
  "navigationVerified": false,
  "exportRightsConfirmed": false
}
```

## Remaining blockers for actual release
1. **Armoured Guardian model:** The approved face and metallic silver/gold armour reference is saved in STAARWAARDD Library, but no reviewable identity-matched animated facial GLB is in the build. A static PNG does not become rigged 3D automatically.
2. **Nine visually final scenes:** Ten distinct accepted GLB files including Singles Lounge, with textures, lighting, animation, actual device captures, and founder approval have not been delivered. Current Three.js worlds are functional *development previews*.
3. **Live providers and device:** OAuth registrations and real user authorization must be verified, and native iPhone/Watch checks performed.
4. **Signed release:** A green Expo prebuild or unsigned simulator compile is not an App Store signed IPA. TestFlight remains deferred until requested.

## Founder constraints
- Locked startup film untouched at its previously confirmed SHA-256.
- Eleven approved visual PNG masters unchanged.
- No generic replacement Guardian head or tracksuit; **silver/gunmetal armour with gold maple-leaf crest** is the only approved look.
- Paid creative generation: **CAD $0 authorized/spent on this development branch**. Obtain provider-specific quote and explicit spending authorization before credits.
- Never merge production or submit to TestFlight on an automatically passing CI check alone.

**Release verdict: DEVELOPMENT DELIVERY ONLY; production sign-off blocked.**
