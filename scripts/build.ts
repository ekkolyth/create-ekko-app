#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

console.log("🔨 Building native binary for npm...");

// Create bin directory
try {
  await Deno.mkdir("bin", { recursive: true });
} catch {
  // Directory already exists
}

console.log("📦 Compiling native binary...");

const result = await new Deno.Command("deno", {
  args: [
    "compile",
    "--allow-all",
    "--output",
    "bin/create-ekko-app",
    "cli.ts",
  ],
  stdout: "inherit",
  stderr: "inherit",
}).output();

if (!result.success) {
  console.error("❌ Failed to compile native binary");
  Deno.exit(1);
}

console.log("✅ Generated native binary");
console.log("📦 Ready to publish to npm!");
