// One-object, short-lived download for the authorized internal-only Codemagic job.
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';

const origin = 'https://quohtbuwaqlckeqswmix.supabase.co';
const object = '/storage/v1/object/sign/staar-testflight-staging/DE231038-97C3-45A5-91B4-DB1502CBAC1E.jpeg';
const length = 757337;
const digest = 'b5a55b64631127e657c50b898be5102f1cb8cce307d5296d156110ee67ac75aa';

export async function stage(env, output, transport = fetch) {
  if (env.STAAR_WINGED_SIGNED_INTERNAL_REVIEW !== '1' ||
      env.STAAR_PRIVATE_PORTAL_ARTWORK_AUTHORIZED !== '1' ||
      env.EAS_BUILD_PROFILE !== 'production' || !output || !isAbsolute(output)) {
    throw new Error('Private artwork requires the authorized internal signing job.');
  }
  let url;
  try { url = new URL(env.STAAR_DIGGITSTAAR_SIGNED_URL ?? ''); } catch {
    throw new Error('A valid private artwork transfer is required.');
  }
  const entries = [...url.searchParams.entries()];
  if (url.origin !== origin || url.pathname !== object || url.username || url.password || url.hash ||
      entries.length !== 1 || entries[0][0] !== 'token' || !/^[A-Za-z0-9_.-]{30,2048}$/.test(entries[0][1])) {
    throw new Error('Private artwork transfer target does not match the approved object.');
  }
  let reader;
  const chunks = [];
  let bytes = 0;
  try {
    const response = await transport(url, {redirect: 'error', signal: AbortSignal.timeout(20000)});
    if (response.status !== 200 || !response.body || response.redirected) throw new Error();
    reader = response.body.getReader();
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > length) throw new Error();
      chunks.push(value);
    }
  } catch {
    if (reader) await reader.cancel().catch(() => {});
    throw new Error('Private artwork download failed or the transfer expired.');
  } finally {
    reader?.releaseLock();
  }
  const data = Buffer.concat(chunks);
  if (bytes !== length || createHash('sha256').update(data).digest('hex') !== digest) {
    throw new Error('Private artwork did not match the approved master.');
  }
  await writeFile(output, data, {flag: 'wx', mode: 0o600});
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  // Never print a URL, exception cause, or response body.
  try {
    await stage(process.env, process.argv[2]);
    console.log('Private artwork verified and staged for the internal signing job.');
  } catch {
    console.error('BLOCKED: could not stage the exact approved private artwork.');
    process.exitCode = 1;
  }
}
