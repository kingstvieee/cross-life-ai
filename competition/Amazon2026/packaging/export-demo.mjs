// Export the existing PR #14 demo only. Never copy the repository or its history.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const target = resolve(process.argv[2] || '');
if (!process.argv[2] || target === resolve(root) || target.startsWith(resolve(root) + sep)) {
  throw new Error('Provide a new destination outside the source repository.');
}
const paths = [
  'api/amazon-guardian.mjs',
  'competition/Amazon2026/package.json',
  'competition/Amazon2026/judge-server.mjs',
  'competition/Amazon2026/src/guardian-core.mjs',
  'competition/Amazon2026/src/aws-smoke.mjs',
  'competition/Amazon2026/src/aws-strands-adapter.mjs',
  'frontend/public/amazon-judge.html',
  'frontend/public/amazon-judge.js',
  'frontend/public/amazon-judge.css'
];
// Load the whole allowlist before creating output; refuse to overwrite any destination.
const files = await Promise.all(paths.map(async path => [path, await readFile(resolve(root, path))]));
const license = await readFile(new URL('LICENSE', import.meta.url));
const readme = await readFile(new URL('STANDALONE_README.md', import.meta.url));
await mkdir(target);
for (const [path, bytes] of files) {
  await mkdir(dirname(resolve(target, path)), { recursive: true });
  await writeFile(resolve(target, path), bytes, { flag: 'wx' });
}
await writeFile(resolve(target, 'LICENSE'), license, { flag: 'wx' });
await writeFile(resolve(target, 'README.md'), readme, { flag: 'wx' });
await writeFile(resolve(target, '.gitignore'), 'node_modules/\n.env\n.env.*\n!.env.example\n', { flag: 'wx' });
console.log(`Exported ${files.length} unchanged demo files plus README, LICENSE and .gitignore to ${target}`);
console.log('No production code, media, credentials or Git history copied. Publication and Devpost verification are separate steps.');
