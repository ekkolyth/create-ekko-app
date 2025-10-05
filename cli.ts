#!/usr/bin/env -S deno run --allow-all

/**
 * create-ekko-app - Custom Next.js starter CLI
 * 
 * This CLI tool creates a Next.js app with optional integrations:
 * - shadcn/ui components with customizable themes
 * - Clerk authentication
 * - Convex database
 * - Email services (react-email, resend, react-hook-form)
 * 
 * Usage: deno run -A jsr:@mikekenway/create-ekko-app [project-name]
 */

// Import required modules
import { Input, Select, Confirm } from '@cliffy/prompt';

/**
 * Utility function to execute shell commands
 * @param {string} cmd - Command to execute
 * @param {object} options - Execution options
 */
function run(cmd: string, options: { silent?: boolean } = {}) {
  const args = cmd.split(' ');
  const command = new Deno.Command(args[0], {
    args: args.slice(1),
    stdout: options.silent ? 'null' : 'inherit',
    stderr: options.silent ? 'null' : 'inherit',
    stdin: 'inherit',
  });
  
  const { code, success } = command.outputSync();
  if (!success) {
    throw new Error(`Command failed with exit code ${code}: ${cmd}`);
  }
}

// Get project name from command line arguments
const cliArgName = Deno.args[0];

/**
 * STEP 1: Get project name
 * 
 * If project name is provided as CLI argument, use it.
 * Otherwise, prompt the user for a project name.
 */
let projectName = cliArgName;
if (!projectName) {
  try {
    projectName = await Input.prompt({
      message: 'What is your project called?',
      default: 'my-app',
    });
  } catch (error) {
    console.log('\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n');
    Deno.exit(0);
  }
  
  if (!projectName) {
    console.log('\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n');
    Deno.exit(0);
  }
}

/**
 * STEP 2: Ask all configuration questions upfront
 * 
 * We ask all questions before doing any installations to provide
 * a smooth, uninterrupted experience. This includes:
 * - shadcn/ui with color theme selection
 * - Clerk authentication
 * - Convex database
 * - Email services
 */
let useShadcn: boolean;
let shadcnColor: string;
let useClerk: boolean;
let useConvex: boolean;
let useEmail: boolean;

try {
  useShadcn = await Confirm.prompt({
    message: 'Would you like to use shadcn?',
    default: true,
  });

  shadcnColor = await Select.prompt({
    message: 'What base color would you like for shadcn?',
    options: [
      { name: 'Neutral', value: 'neutral' },
      { name: 'Gray', value: 'gray' },
      { name: 'Zinc', value: 'zinc' },
      { name: 'Stone', value: 'stone' },
      { name: 'Slate', value: 'slate' },
    ],
    default: 'neutral',
  });

  useClerk = await Confirm.prompt({
    message: 'Would you like to use clerk?',
    default: false,
  });

  useConvex = await Confirm.prompt({
    message: 'Would you like to use convex?',
    default: false,
  });

  useEmail = await Confirm.prompt({
    message: 'Would you like to install email services?',
    default: true,
  });
} catch (error) {
  console.log('\n❌ Follow-up prompts were cancelled. Skipping extra setup.');
  Deno.exit(0);
}

/**
 * STEP 3: Display summary of selections
 * 
 * Show the user exactly what will be installed before proceeding.
 * This gives them a chance to see their choices and builds confidence.
 */
console.log('\n📋 Summary of selections:');
if (useShadcn) console.log(`  ✓ shadcn/ui with all components (${shadcnColor} theme)`);
if (useClerk) console.log('  ✓ Clerk authentication');
if (useConvex) console.log('  ✓ Convex database');
if (useEmail) console.log('  ✓ Email services (react-hook-form, react-email, resend)');

/**
 * STEP 4: Create the Next.js application
 * 
 * Use the official create-next-app CLI to scaffold the base Next.js project.
 * This will run interactively and ask the user about TypeScript, Tailwind, etc.
 */
console.log('\n⚙️  Creating Next.js app with create-next-app...');
run(`pnpm dlx create-next-app@latest ${projectName}`);

/**
 * STEP 5: Change to project directory
 * 
 * Move into the newly created project directory so we can install
 * additional dependencies and run setup commands.
 */
Deno.chdir(projectName);

/**
 * STEP 6: Install all selected dependencies
 * 
 * Collect all dependencies based on user selections and install them
 * in a single pnpm command for efficiency. This includes:
 * 
 * shadcn/ui dependencies:
 * - class-variance-authority: For component variant management
 * - clsx: For conditional CSS classes
 * - tailwindcss-animate: For Tailwind animations
 * - lucide-react: Icon library used by shadcn components
 * - tailwind-merge: For merging Tailwind classes
 * 
 * Other integrations:
 * - @clerk/nextjs: Authentication
 * - convex: Database
 * - react-hook-form, @react-email/components, @react-email/render, resend: Email services
 */
const deps: string[] = [];
if (useShadcn) {
  deps.push(
    'class-variance-authority',
    'clsx',
    'tailwindcss-animate',
    'lucide-react',
    'tailwind-merge'
  );
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

/**
 * STEP 7: Run post-install setup steps
 * 
 * After dependencies are installed, run any necessary setup commands.
 * Currently this only applies to shadcn/ui:
 * 
 * 1. Initialize shadcn with the user's selected color theme
 * 2. Install all available shadcn components
 * 
 * This ensures the user gets a fully configured shadcn setup
 * with all components ready to use.
 */
if (useShadcn) {
  try {
    console.log(
      `\n✨ Initializing shadcn with ${shadcnColor} theme (this may update Tailwind config and add components)...`
    );
    // Using the official shadcn CLI with the selected color
    run(`pnpm dlx shadcn@latest init -y --base-color ${shadcnColor}`);

    console.log('\n🎨 Installing all available shadcn components...');
    // Add all available shadcn components
    run(`pnpm dlx shadcn@latest add --all -y`);
  } catch (e) {
    console.log('\n⚠️  shadcn setup failed. You can run it later with:');
    console.log('   pnpm dlx shadcn@latest init');
    console.log('   pnpm dlx shadcn@latest add --all');
  }
}

/**
 * STEP 8: Open project in VS Code (optional)
 * 
 * Try to automatically open the project in VS Code for convenience.
 * If the 'code' command is not available, provide instructions.
 */
try {
  run('code .', { silent: true });
  console.log('\n🧰 Opened in VS Code (code .).');
} catch (e) {
  console.log('\nℹ️  VS Code command-line tool not found. To open the project, run:');
  console.log(`   cd ${projectName} && code .`);
}

/**
 * STEP 9: Display completion message and next steps
 * 
 * Provide clear instructions on how to start the development server
 * and what the user can do next.
 */
console.log('\n✅ Done! Your app is ready.');
console.log('\nNext steps:');
console.log(`  cd ${projectName}`);
console.log('  pnpm dev');
