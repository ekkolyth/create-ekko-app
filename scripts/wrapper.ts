#!/usr/bin/env node
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";
import process from "process";

const platform = os.platform();
const arch = os.arch();

const binaryMap: Record<string, string> = {
  "linux-x64": "create-ekko-app-linux",
  "win32-x64": "create-ekko-app-win.exe",
  "darwin-x64": "create-ekko-app-macos",
  "darwin-arm64": "create-ekko-app-macos-arm64",
};

const platformKey = `${platform}-${arch}`;
const binaryName = binaryMap[platformKey];

if (!binaryName) {
  console.error(`Unsupported platform: ${platform}-${arch}`);
  process.exit(1);
}

const binaryPath = path.join(__dirname, binaryName);
const child = spawn(binaryPath, process.argv.slice(2), { stdio: "inherit" });

child.on("close", (code) => process.exit(code));
