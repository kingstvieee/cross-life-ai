# Build 243: private, alternative facial rendering study — NOT a production source asset

**Date:** 2026-11-20. **Cost:** CAD $0. **Release:** NO-GO.

The verified private Build242 source had SHA `8c2ed15001070453e232809492de8916d2e46313d835d21556e6a8fc80dcb768`.
A private non-release GLB face rendering variant now exists with SHA
`804f4e0f714bcbde63572d8ac83cb11a9a6c2e6ee888117b749a591df163ae78`,
11,115,436 bytes.

**Non-destructive implementation study**
- The exact initial 4,735,136-byte protected Build228 facial BIN prefix is unchanged.
- Original 16 facial morph target descriptors, UVs, bone assignments, all skins, all materials, 11 animations and Build242 head/neck attachment are unchanged.
- A *new* appended index accessor reverses winding of 20,160 face triangles and a *new* normal accessor points 10,285 normals outward, without overwriting the original geometry bytes. The face mesh primitive now uses these new accessors. This is a **changed visual mesh descriptor** and requires independent exact-variant owner consent.
- The zero-scale Build225 parent containing 149 hidden legacy/silver armor nodes is disconnected from the scene graph. Mesh definitions and old geometry bytes remain in the package; therefore **no package-size/memory win is claimed**. Offline Trimesh confirms active graph nodes 195 -> 45.
- The face material stays double-sided. This study does not authorize changing it to single-sided or altering the actual real-person face.

**Independent technical test:** 15/15 checks pass for preserved facial bytes, reversed original indices/normals, unchanged 11 animations, correct skin/head/neck hierarchy and active-node reachability. This is **not** a visual acceptance, real-iPhone performance test, glTF official-validator pass, right-to-use receipt, or Apple release.

**Production control:** This variant is stored in a private chat artifact only. Its GLB is **not** committed to this public repository, staged in production assets, approved by the active importer or shipped to the app. It must not bypass the Build242 source-only render guards and cannot become release-approved through metadata alone.

**Unresolved:** facial resemblance under newly oriented normals, artist-approved neck/collar deformation, natural gait/hand/shoulder/foot body mechanics, real hardware speech sync, ten final portal worlds, rights, approved signed EAS archive and verified TestFlight install.
