// Run after Expo iOS prebuild. Compare generated Xcode targets with the EAS
// signing manifest, so display-name/product-name drift fails before a cloud build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const xcode = require('xcode');

const ios = path.resolve(__dirname, '../ios');
const projects = fs.readdirSync(ios).filter(name => name.endsWith('.xcodeproj'));
assert.equal(projects.length, 1, 'Expected one generated iOS project');
const project = xcode.project(path.join(ios, projects[0], 'project.pbxproj'));
project.parseSync();
const names = Object.values(project.pbxNativeTargetSection())
  .filter(value => value && typeof value === 'object')
  .map(target => target.name.replace(/^"|"$/g, ''));
const config = JSON.parse(execFileSync(process.execPath,
  [require.resolve('expo/bin/cli'), 'config', '--type', 'introspect', '--json'],
  { encoding: 'utf8', cwd: path.resolve(__dirname, '..') }));
const extensions = config.extra?.eas?.build?.experimental?.ios?.appExtensions || [];
assert.ok(extensions.length, 'Watch signing target is absent from Expo configuration');
for (const extension of extensions) {
  assert.ok(names.includes(extension.targetName),
    `EAS signing target ${extension.targetName} is missing from Xcode (${names.join(', ')})`);
}
assert.ok(extensions.some(target =>
  target.bundleIdentifier === config.ios.bundleIdentifier + '.watchkitapp'),
  'Watch signing bundle must match the phone companion');
console.log('Generated Xcode targets match EAS signing targets:', names.join(', '));
