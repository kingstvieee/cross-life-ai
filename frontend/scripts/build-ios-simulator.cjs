// Compile the actual generated native modules on an Apple SDK without signing.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const xcode = require('xcode');
const ios = path.resolve(__dirname, '../ios');
const projectName = fs.readdirSync(ios).find(name => name.endsWith('.xcodeproj'));
const workspace = fs.readdirSync(ios).find(name => name.endsWith('.xcworkspace'));
if (!projectName || !workspace) throw new Error('Prebuild and pod install must run first.');
const project = xcode.project(path.join(ios, projectName, 'project.pbxproj'));
project.parseSync();
const target = Object.values(project.pbxNativeTargetSection()).find(item =>
  item && typeof item === 'object' && item.productType?.replaceAll('"', '') === 'com.apple.product-type.application');
if (!target) throw new Error('Generated iPhone app target is missing.');
execFileSync('xcodebuild', ['-workspace', path.join(ios, workspace), '-scheme', target.name.replaceAll('"', ''),
  '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
  '-derivedDataPath', path.join(ios, 'simulator-build'), 'CODE_SIGNING_ALLOWED=NO', 'build'],
  { stdio: 'inherit', cwd: ios });
