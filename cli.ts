#!/usr/bin/env -S deno run --allow-all

import { Checkbox, Input, Select } from "@cliffy/prompt";

function run(cmd: string, options: { silent?: boolean } = {}) {
  const args = cmd.split(" ");
  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    stdout: options.silent ? "null" : "inherit",
    stderr: options.silent ? "null" : "inherit",
    stdin: "inherit",
  });

  const { code, success } = command.outputSync();
  if (!success) {
    throw new Error(`Command failed with exit code ${code}: ${cmd}`);
  }
}

// Get project name from command line arguments
const cliArgName = Deno.args[0];

// STEP 1: Get project name

let projectName = cliArgName;

if (!projectName) {
  try {
    projectName = await Input.prompt({
      message: "What is your project called?",
      default: "ekko-app",
    });
  } catch (_error) {
    console.log(
      "\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n",
    );
    Deno.exit(0);
  }

  if (!projectName) {
    console.log(
      "\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n",
    );
    Deno.exit(0);
  }
}

// STEP 2: Ask all configuration questions upfront

// Styling
let useShadcn: boolean;
let shadcnColor: string | null = null;

// Auth
let useClerk: boolean;
let useBetterAuth: boolean;

// DB
let useConvex: boolean;

// Email
let useResend: boolean;
let useEmail: boolean;

// Tools
let useTanstackQuery: boolean;
let useReactHookForm: boolean;
let useTanstackForm: boolean;

try {
  const selectedPackages: string[] = await Checkbox.prompt({
    message: "Select Which Packages you'd like to use:",
    options: [
      { name: "Auth: Clerk", value: "clerk" },
      { name: "Auth: Better Auth", value: "better-auth" },
      { name: "DB: Convex", value: "convex" },
      { name: "Email: React Email", value: "react-email" },
      { name: "Email: Resend", value: "resend" },
      { name: "Tools: Tanstack Query", value: "tanstack-query" },
      { name: "Tools: Tanstack Form", value: "tanstack-form" },
      { name: "Tools: React Hook Form", value: "react-hook-form" },
      { name: "Styling: shadcn/ui", value: "shadcn" },
    ],
    default: [],
  });

  // Marry Variables to User Selection
  useShadcn = selectedPackages.includes("shadcn");
  useClerk = selectedPackages.includes("clerk");
  useBetterAuth = selectedPackages.includes("better-auth");
  useConvex = selectedPackages.includes("convex");
  useEmail = selectedPackages.includes("react-email");
  useResend = selectedPackages.includes("resend");
  useTanstackQuery = selectedPackages.includes("tanstack-query");
  useTanstackForm = selectedPackages.includes("tanstack-form");
  useReactHookForm = selectedPackages.includes("react-hook-form");

  // If shadcn is selected, Ask for color theme
  if (useShadcn) {
    shadcnColor = await Select.prompt({
      message: "What base color would you like for shadcn?",
      options: [
        { name: "Neutral", value: "neutral" },
        { name: "Gray", value: "gray" },
        { name: "Zinc", value: "zinc" },
        { name: "Stone", value: "stone" },
        { name: "Slate", value: "slate" },
      ],
      default: "zinc",
    });
  }
} catch (_error) {
  console.log("\n❌ Setup Cancelled.");
  Deno.exit(0);
}

/**
 * STEP 3: Display summary of selections
 */
console.log("\n📋 Summary of selections:");
if (useShadcn) {
  console.log(`  ✓ shadcn/ui with all components (${shadcnColor} theme)`);
}
if (useClerk) console.log("  ✓ Clerk");
if (useBetterAuth) console.log("  ✓ Better Auth");
if (useConvex) console.log("  ✓ Convex");
if (useEmail) console.log("  ✓ React Email");
if (useResend) console.log("  ✓ Resend");
if (useTanstackQuery) console.log("  ✓ Tanstack Query");
if (useTanstackForm) console.log("  ✓ Tanstack Form");
if (useReactHookForm) console.log("  ✓ React Hook Form");

/**
 * STEP 4: Create the Next.js application
 */
console.log("\n⚙️  Creating Next.js app...");
run(
  `pnpm dlx create-next-app@latest ${projectName} --app --ts --tailwind --eslint --turbopack --src-dir --use-pnpm --import-alias @/*`,
);

/**
 * STEP 5: Change to project directory
 */
Deno.chdir(projectName);

/**
 * STEP 6: Install all selected dependencies
 */
const deps: string[] = [];

// Styling
if (useShadcn) {
  deps.push(
    "class-variance-authority",
    "clsx",
    "tailwindcss-animate",
    "lucide-react",
    "tailwind-merge",
  );
}

// Auth
if (useClerk) deps.push("@clerk/nextjs");
if (useBetterAuth) deps.push("better-auth");

// DB
if (useConvex) deps.push("convex");

// Email stacks
if (useEmail) {
  deps.push("@react-email/components", "@react-email/render");
}
if (useResend) {
  deps.push("resend");
}

// Tools
if (useTanstackQuery) deps.push("@tanstack/react-query");
if (useTanstackForm) deps.push("@tanstack/react-form");
if (useReactHookForm) deps.push("react-hook-form");

if (deps.length > 0) {
  console.log("\n📦 Installing selected dependencies with pnpm...");
  run(`pnpm add ${deps.join(" ")}`);
}

/**
 * STEP 7: Run post-install setup steps
 */
if (useShadcn) {
  try {
    console.log(`\n✨ Initializing shadcn with ${shadcnColor} theme...`);
    run(`pnpm dlx shadcn@latest init -y --base-color ${shadcnColor}`);

    console.log("\n🎨 Installing all available shadcn components...");
    run(`pnpm dlx shadcn@latest add --all -y`);
  } catch (_e) {
    console.log("\n⚠️  shadcn setup failed. You can run it later with:");
    console.log("   pnpm dlx shadcn@latest init");
    console.log("   pnpm dlx shadcn@latest add --all");
  }
}

/**
 * STEP 8: Open project in VS Code (optional)
 */
try {
  run("code .", { silent: true });
  console.log("\n🧰 Opened in VS Code (code .).");
} catch (_e) {
  console.log(
    "\nℹ️  VS Code command-line tool not found. To open the project, run:",
  );
  console.log(`   cd ${projectName} && code .`);
}

/**
 * STEP 9: Completion + next steps
 */
console.log("\n✅ Done! Your app is ready.");
console.log("\nNext steps:");
console.log(`  cd ${projectName}`);
console.log("  pnpm dev");
