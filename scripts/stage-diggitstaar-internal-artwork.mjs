// Source is supplied from the owner's private artwork handoff, never a public URL.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';

const module = new URL('../frontend/components/staarwardd/diggitstaar-studio-source.ios.ts', import.meta.url);
const assetDir = new URL('../frontend/generated/private-portal-art/', import.meta.url);
const asset = new URL('diggitstaar-studio.jpeg', assetDir);
const temporaryAsset = new URL('diggitstaar-studio.jpeg.tmp', assetDir);
const moduleText = "export default require('../../generated/private-portal-art/diggitstaar-studio.jpeg') as number;\n";
const expectedSha256 = 'b5a55b64631127e657c50b898be5102f1cb8cce307d5296d156110ee67ac75aa';
await rm(module, { force: true });
await rm(asset, { force: true });
await rm(temporaryAsset, { force: true });
if (process.env.STAAR_WINGED_SIGNED_INTERNAL_REVIEW !== '1' || process.env.STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED !== '1') {
  throw new Error('Private DIGGITSTAAR artwork requires the explicitly authorized signed internal review lane.');
}
const source = process.argv[2];
if (!source) throw new Error('Provide the owner’s exact studio artwork JPEG.');
const bytes = await readFile(source);
if (createHash('sha256').update(bytes).digest('hex') !== expectedSha256) {
  throw new Error('DIGGITSTAAR studio artwork does not match the approved master.');
}
await mkdir(assetDir, { recursive: true });
await writeFile(temporaryAsset, bytes);
await rename(temporaryAsset, asset);
await writeFile(module, moduleText);
console.log('Staged exact owner-approved DIGGITSTAAR artwork for the internal iOS candidate.');
