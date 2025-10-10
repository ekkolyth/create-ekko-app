#!/usr/bin/env -S deno run --allow-read --allow-write

const denoConfig = JSON.parse(Deno.readTextFileSync("deno.json"));

const packageJson = {
  name: denoConfig.name.replace("@mikekenway/", ""),
  version: denoConfig.version,
  description: denoConfig.description,
  license: denoConfig.license,
  main: "bin/create-ekko-app",
  bin: {
    "create-ekko-app": "./bin/create-ekko-app",
  },
  files: [
    "README.md",
    "bin/create-ekko-app",
    "bin/create-ekko-app-linux",
    "bin/create-ekko-app-win.exe",
    "bin/create-ekko-app-macos",
    "bin/create-ekko-app-macos-arm64",
  ],
  scripts: {
    build: "deno compile --allow-all --output ./build/create-ekko-app cli.ts",
  },
  repository: {
    type: "git",
    url: "https://github.com/ekkolyth/create-ekko-app.git",
  },
  keywords: denoConfig.keywords || [],
  author: denoConfig.author || "",
};

Deno.writeTextFileSync("package.json", JSON.stringify(packageJson, null, 2));
console.log("✅ Generated package.json from deno.json");
