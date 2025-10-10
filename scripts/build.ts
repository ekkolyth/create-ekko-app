#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

console.log("Building native binaries for all platforms...");

// Create bin directory
try {
  await Deno.mkdir("bin", { recursive: true });
} catch {
  // Directory already exists
}

const platforms = [
  { target: "x86_64-unknown-linux-gnu", name: "create-ekko-app-linux" },
  { target: "x86_64-pc-windows-msvc", name: "create-ekko-app-win.exe" },
  { target: "x86_64-apple-darwin", name: "create-ekko-app-macos" },
  { target: "aarch64-apple-darwin", name: "create-ekko-app-macos-arm64" },
];

console.log("Compiling for multiple platforms...");

for (const platform of platforms) {
  console.log(`  Building ${platform.name} for ${platform.target}...`);

  const result = await new Deno.Command("deno", {
    args: [
      "compile",
      "--allow-all",
      "--target",
      platform.target,
      "--output",
      `bin/${platform.name}`,
      "cli.ts",
    ],
    stdout: "inherit",
    stderr: "inherit",
  }).output();

  if (!result.success) {
    console.error(`❌ Failed to compile for ${platform.target}`);
    Deno.exit(1);
  }
}

// Create a platform detection wrapper script
const wrapperScript = await Deno.readTextFile("scripts/wrapper.ts");
await Deno.writeTextFile("bin/create-ekko-app", wrapperScript);
await Deno.chmod("bin/create-ekko-app", 0o755);

console.log("✅ Generated native binaries for all platforms");
console.log("✅ Created platform detection wrapper");
console.log("📦 Ready to publish to npm!");
