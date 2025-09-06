#!/usr/bin/env node

import prompts from 'prompts';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(cmd, options = {}) {
  execSync(cmd, { stdio: 'inherit', ...options });
}

const cliArgName = process.argv[2];

let projectName = cliArgName;
if (!projectName) {
  const nameAnswer = await prompts(
    {
      type: 'text',
      name: 'projectName',
      message: 'What is your project called?',
      initial: 'my-app',
    },
    { stdout: process.stdout }
  );
  if (!nameAnswer.projectName) {
    console.log('\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n');
    process.exit(0);
  }
  projectName = nameAnswer.projectName;
}

// 1) Ask all follow-up questions first
const followUps = await prompts(
  [
    {
      type: 'toggle',
      name: 'useShadcn',
      message: 'Would you like to use shadcn?',
      initial: true,
      active: 'Yes',
      inactive: 'No',
    },
    {
      type: 'toggle',
      name: 'useClerk',
      message: 'Would you like to use clerk?',
      initial: false,
      active: 'Yes',
      inactive: 'No',
    },
    {
      type: 'toggle',
      name: 'useConvex',
      message: 'Would you like to use convex?',
      initial: false,
      active: 'Yes',
      inactive: 'No',
    },
    {
      type: 'toggle',
      name: 'useEmail',
      message: 'Would you like to install email services?',
      initial: true,
      active: 'Yes',
      inactive: 'No',
    },
  ],
  { stdout: process.stdout }
);

if (!followUps) {
  console.log('\n❌ Follow-up prompts were cancelled. Skipping extra setup.');
  process.exit(0);
}

const { useShadcn, useClerk, useConvex, useEmail } = followUps;

// 2) Show what will be installed
console.log('\n📋 Summary of selections:');
if (useShadcn) console.log('  ✓ shadcn/ui');
if (useClerk) console.log('  ✓ Clerk authentication');
if (useConvex) console.log('  ✓ Convex database');
if (useEmail) console.log('  ✓ Email services (react-hook-form, react-email, resend)');

// 3) Create Next.js app
console.log('\n⚙️  Creating Next.js app with create-next-app...');
run(`pnpm dlx create-next-app@latest ${projectName}`);

// 4) Move into the project directory
process.chdir(projectName);

// 5) Install all dependencies first
const deps = [];
if (useShadcn) {
  deps.push('class-variance-authority', 'clsx', 'tailwindcss-animate');
}
if (useClerk) {
  deps.push('@clerk/nextjs');
}
if (useConvex) {
  deps.push('convex');
}
if (useEmail) {
  deps.push('react-hook-form', '@react-email/components', '@react-email/render', 'resend');
}

if (deps.length > 0) {
  console.log('\n📦 Installing selected dependencies with pnpm...');
  run(`pnpm add ${deps.join(' ')}`);
}

// 6) Run post-install setup steps
if (useShadcn) {
  try {
    console.log('\n✨ Initializing shadcn (this may update Tailwind config and add components)...');
    // Using the official shadcn CLI
    run('pnpm dlx shadcn@latest init -y');
  } catch (e) {
    console.log('\n⚠️  shadcn init failed. You can run it later with: pnpm dlx shadcn@latest init');
  }
}

// 7) Try to open the project in VS Code
try {
  execSync('code .', { stdio: 'ignore' });
  console.log('\n🧰 Opened in VS Code (code .).');
} catch (e) {
  console.log('\nℹ️  VS Code command-line tool not found. To open the project, run:');
  console.log(`   cd ${projectName} && code .`);
}

console.log('\n✅ Done! Your app is ready.');
console.log('\nNext steps:');
console.log(`  cd ${projectName}`);
console.log('  pnpm dev');
