#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

import { parseArgs } from '@std/cli/parse-args';

// Parse command line arguments
const args = parseArgs(Deno.args, {
  boolean: ['major', 'minor', 'patch'],
  default: { patch: false, minor: false, major: false },
});

// Check if any bump flags are provided
const bumpFlags = [args.major, args.minor, args.patch].filter(Boolean);

// Determine if we're doing a version bump
const shouldBumpVersion = bumpFlags.length > 0;

// If no bump flags provided, exit with error
if (!shouldBumpVersion) {
  console.error('❌ Error: No version bump type specified');
  console.error('💡 Usage: deno task publish --patch (or --minor/--major)');
  console.error('💡 To rebuild binary without version bump, use: deno task build:npm');
  Deno.exit(1);
}

// Validate only one bump type is specified if bumping is requested
if (bumpFlags.length > 1) {
  console.error('❌ Error: Only one version bump type can be specified');
  Deno.exit(1);
}

let bumpType: string | null = null;
if (shouldBumpVersion) {
  if (args.major) bumpType = 'major';
  else if (args.minor) bumpType = 'minor';
  else if (args.patch) bumpType = 'patch';
}

// Load .env file if it exists
try {
  const env = Deno.readTextFileSync('.env');
  env.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) Deno.env.set(key.trim(), value.trim());
  });
} catch {
  /* .env file not found - that's ok */
}

// Version bumping logic (only if bump flags are provided)
let currentVersion = '';
let newVersion = '';

if (shouldBumpVersion && bumpType) {
  // Read current deno.json
  const denoConfigPath = 'deno.json';
  const denoConfigText = Deno.readTextFileSync(denoConfigPath);
  const denoConfig = JSON.parse(denoConfigText);

  // Parse current version and calculate new version
  currentVersion = denoConfig.version;
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (bumpType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  console.log(`📈 Bumping ${bumpType} version: ${currentVersion} → ${newVersion}`);

  // Update deno.json with new version
  denoConfig.version = newVersion;
  Deno.writeTextFileSync(denoConfigPath, JSON.stringify(denoConfig, null, 2));

  console.log('✅ Updated deno.json');
}

// Build native binary for npm
console.log('Building native binary for npm...');
const buildResult = await new Deno.Command('deno', {
  args: ['task', 'build:npm'],
}).output();

if (!buildResult.success) {
  console.error('❌ Failed to build native binary');
  Deno.exit(1);
}

// Git operations (only when version bumping)
console.log('📝 Committing changes...');
await new Deno.Command('git', {
  args: ['add', 'deno.json', 'bin/create-ekko-app'],
}).output();
await new Deno.Command('git', {
  args: ['commit', '-m', `Bump ${bumpType} version to ${newVersion}`],
}).output();

console.log('🏷️  Creating version tag...');
const tagName = `v${newVersion}`;
await new Deno.Command('git', { args: ['tag', tagName] }).output();

// Create/update latest tag
console.log('🏷️  Updating latest tag...');
await new Deno.Command('git', { args: ['tag', '-f', 'latest'] }).output();

console.log('🚀 Pushing to GitHub...');
await new Deno.Command('git', { args: ['push', 'origin', 'main'] }).output();
await new Deno.Command('git', { args: ['push', 'origin', '--tags', '--force'] }).output();

console.log('📦 Native binary generated for npm');

if (shouldBumpVersion && bumpType && newVersion) {
  console.log('🚀 GitHub Actions will now publish to both JSR and npm!');
  console.log(`🎉 Version ${newVersion} ready for release!`);
  console.log('🏷️  Latest tag updated to point to this release');
  console.log('\n💡 To test locally, run: npm pack');
} else {
  console.log('Binary rebuilt and pushed to GitHub');
  console.log('💡 To test locally, run: npm pack');
  console.log(
    '💡 To publish with version bump, use: deno task publish --patch (or --minor/--major)'
  );
}
