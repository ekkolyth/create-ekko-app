#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

import { bundle } from "jsr:@deno/emit@0.46.0";

console.log("🔨 Bundling cli.ts to cli.js for npm...");

// Read import map from deno.json
const denoConfig = JSON.parse(await Deno.readTextFile("deno.json"));
const importMap = { imports: denoConfig.imports };

// Bundle the TypeScript file with all dependencies
const url = new URL("../cli.ts", import.meta.url);
const result = await bundle(url, { importMap });
const jsCode = result.code;

if (!jsCode) {
  console.error("❌ Failed to bundle cli.ts");
  Deno.exit(1);
}

// Add Node.js shebang and createRequire for ES modules
let finalCode = `#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

` + jsCode
  // Replace Deno.Command with Node.js child_process.spawn
  .replace(/new Deno\.Command\(/g, 'require("child_process").spawn(')
  .replace(/\.outputSync\(\)/g, "")
  // Replace Deno.chdir with process.chdir
  .replace(/Deno\.chdir\(/g, "process.chdir(")
  // Replace Deno.exit with process.exit
  .replace(/Deno\.exit\(/g, "process.exit(")
  // Replace Deno.args with process.argv.slice(2)
  .replace(/Deno\.args/g, "process.argv.slice(2)")
  // Replace Deno.env with process.env - handle specific cases
  .replace(
    /Deno\.env\.get\(getHomeDirEnvVar\(\)\)/g,
    "process.env[getHomeDirEnvVar()]",
  )
  .replace(/Deno\.env\.get\(([^)]+)\)/g, "process.env[$1]")
  .replace(/Deno\.env\./g, "process.env.")
  // Replace Deno.build.os
  .replace(/Deno\.build\.os/g, "process.platform")
  .replace(/"windows"/g, '"win32"')
  // Replace Deno.errors
  .replace(/Deno\.errors\.NotFound/g, "Error")
  .replace(/Deno\.errors\.PermissionDenied/g, "Error")
  // Replace Deno.permissions with stub
  .replace(
    /Deno\.permissions\.query\([^)]+\)/g,
    'Promise.resolve({state: "granted"})',
  )
  .replace(
    /Deno\.permissions\.request\([^)]+\)/g,
    'Promise.resolve({state: "granted"})',
  )
  // Keep dynamic imports as-is for ES modules
  .replace(/await import\("node:fs"\)/g, '(await import("node:fs"))')
  .replace(/await import\("node:([^"]+)"\)/g, '(await import("node:$1"))')
  .replace(/await import\("([^"]+)"\)/g, '(await import("$1"))')
  // Remove or replace other Deno globals that might cause issues
  .replace(
    /const { Deno: Deno1 } = globalThis;/g,
    "// Deno globals removed for Node.js compatibility",
  )
  .replace(
    /typeof Deno1\?\.noColor === "boolean" \? Deno1\.noColor : false/g,
    "false",
  )
  .replace(/Deno1\?\.noColor/g, "false")
  .replace(/Deno1\?\.noColor/g, "false");

// Write the JavaScript file as ES module
await Deno.writeTextFile("cli.mjs", finalCode);

console.log("✅ Generated cli.mjs for npm");
console.log("📦 Ready to publish to npm!");
