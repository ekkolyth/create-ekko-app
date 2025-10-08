#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

// Read current deno.json
const denoConfigPath = "deno.json";
const denoConfigText = Deno.readTextFileSync(denoConfigPath);
const denoConfig = JSON.parse(denoConfigText);

// Parse current version and bump patch
const currentVersion = denoConfig.version;
const [major, minor, patch] = currentVersion.split(".").map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`; // Bump patch version

console.log(`📈 Bumping version: ${currentVersion} → ${newVersion}`);

// Update deno.json with new version
denoConfig.version = newVersion;
Deno.writeTextFileSync(denoConfigPath, JSON.stringify(denoConfig, null, 2));

console.log("✅ Updated deno.json");

// Generate package.json
console.log("🔄 Generating package.json...");
const syncResult = await new Deno.Command("deno", {
  args: ["task", "sync-package"],
}).output();

if (!syncResult.success) {
  console.error("❌ Failed to sync package.json");
  Deno.exit(1);
}

// Git operations
console.log("📝 Committing changes...");
await new Deno.Command("git", { args: ["add", "deno.json", "package.json"] })
  .output();
await new Deno.Command("git", {
  args: ["commit", "-m", `Bump version to ${newVersion}`],
}).output();

console.log("🏷️  Creating tag...");
const tagName = `v${newVersion}`;
await new Deno.Command("git", { args: ["tag", tagName] }).output();

console.log("🚀 Pushing to GitHub...");
await new Deno.Command("git", { args: ["push", "origin", "main"] }).output();
await new Deno.Command("git", { args: ["push", "origin", "--tags"] }).output();

console.log("📦 Publishing to JSR...");
const publishResult = await new Deno.Command("deno", { args: ["publish"] })
  .output();

if (publishResult.success) {
  console.log("✅ Successfully published to JSR");
  console.log(`🎉 Version ${newVersion} is now live!`);
  console.log(`   - JSR: https://jsr.io/@mikekenway/create-ekko-app`);
  console.log(`   - npm: Will be published automatically via GitHub Actions`);
} else {
  console.error("❌ Failed to publish to JSR");
  console.error(new TextDecoder().decode(publishResult.stderr));
}
