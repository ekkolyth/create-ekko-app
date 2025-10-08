#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

// Load .env file if it exists
try {
  const env = Deno.readTextFileSync(".env");
  env.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) Deno.env.set(key.trim(), value.trim());
  });
} catch { /* .env file not found - that's ok */ }

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

// Build JavaScript file for npm
console.log("🔄 Building cli.js for npm...");
const buildResult = await new Deno.Command("deno", {
  args: ["task", "build:npm"],
}).output();

if (!buildResult.success) {
  console.error("❌ Failed to build cli.js");
  Deno.exit(1);
}

// Git operations
console.log("📝 Committing changes...");
await new Deno.Command("git", {
  args: ["add", "deno.json", "cli.mjs"],
}).output();
await new Deno.Command("git", {
  args: ["commit", "-m", `Bump version to ${newVersion}`],
}).output();

console.log("🏷️  Creating tag...");
const tagName = `v${newVersion}`;
await new Deno.Command("git", { args: ["tag", tagName] }).output();

console.log("🚀 Pushing to GitHub...");
await new Deno.Command("git", { args: ["push", "origin", "main"] }).output();
await new Deno.Command("git", { args: ["push", "origin", "--tags"] }).output();

console.log("📦 cli.mjs generated for npm");
console.log("🚀 GitHub Actions will now publish to both JSR and npm!");
console.log(`🎉 Version ${newVersion} ready for release!`);
console.log("\n💡 To test locally, run: npm pack");
