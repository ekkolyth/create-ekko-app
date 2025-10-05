#!/usr/bin/env node

// Minimal ESM shim that executes the bundled Go binary.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mapArch(arch) {
  if (arch === 'x64') return 'amd64';
  return arch; // 'arm64' etc.
}

function mapPlatform(plat) {
  if (plat === 'win32') return 'windows';
  return plat; // 'linux', 'darwin'
}

function fileExists(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
}

function resolveBinary() {
  const override = process.env.CREATE_EKKO_APP_BIN;
  const execName = process.platform === 'win32' ? 'create-ekko-app.exe' : 'create-ekko-app';
  if (override) return override;

  // 1) Local bin from dev/build
  const local = path.join(__dirname, 'bin', execName);
  if (fileExists(local)) return local;

  // 2) Dist by platform (for prebuilt artifacts)
  const osPart = mapPlatform(process.platform);
  const archPart = mapArch(process.arch);
  const dist = path.join(__dirname, 'dist', `${osPart}-${archPart}`, execName);
  if (fileExists(dist)) return dist;

  // 3) Fallback to PATH
  return execName;
}

const bin = resolveBinary();
const args = process.argv.slice(2);
const child = spawn(bin, args, { stdio: 'inherit', windowsHide: true });
child.on('exit', (code, signal) => {
  if (signal) {
    // Propagate typical termination signals
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
child.on('error', (err) => {
  console.error('Failed to start CLI binary:', err.message);
  console.error('If you are developing locally, build it with:');
  console.error('  go build -o bin/create-ekko-app ./cmd/create-ekko-app');
  process.exit(1);
});
