import { lstat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { setTimeout } from 'node:timers/promises';

export async function waitForProtectedArt(env, {inspect = lstat, sleep = setTimeout, now = Date.now} = {}) {
  if (env.STAAR_WINGED_SIGNED_INTERNAL_REVIEW !== '1' || env.STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED !== '1') {
    throw new Error('Protected art not authorized for this lane.');
  }
  const target = env.STAAR_DIGGITSTAAR_MASTER_PATH;
  if (!target || !isAbsolute(target)) throw new Error('Set an absolute protected runner path.');
  const manual = env.STAAR_DIGGITSTAAR_MANUAL_TRANSFER === '1';
  const seconds = manual ? Number(env.STAAR_DIGGITSTAAR_WAIT_SECONDS) : 0;
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 180) throw new Error('Invalid protected-file wait.');
  const deadline = now() + 1000 * seconds;
  do {
    let info;
    try { info = await inspect(target); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error('Cannot inspect the protected runner file.'); }
    if (info) {
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('Protected runner input is not a regular file.');
      if (manual && (info.mode & 0o077)) throw new Error('Manual input must be owner-readable only.');
      return;
    }
    const remaining = deadline - now();
    if (remaining <= 0) break;
    await sleep(Math.min(remaining, 1000));
  } while (true);
  throw new Error('Exact protected runner file did not arrive. No archive started.');
}

if (process.argv[1]?.endsWith('/wait-for-diggitstaar-internal-artwork.mjs')) {
  await waitForProtectedArt(process.env).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
