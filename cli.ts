#!/usr/bin/env -S deno run --allow-all

import { Command } from "@cliffy/command";
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

type Framework = "next" | "tanstack-start";
type AuthChoice = "clerk" | "better-auth" | "none";
type DatabaseChoice = "convex" | "drizzle" | "none";

async function main(projectNameArg?: string): Promise<void> {
  // STEP 1: Get project name
  let projectName: string | undefined = projectNameArg;

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

  // STEP 2: Ask configuration questions
  const framework: Framework = (await Select.prompt({
    message: "Choose your Framework",
    options: [
      { name: "Next JS", value: "next" },
      { name: "TanStack Start", value: "tanstack-start" },
    ],
    default: "next",
  })) as Framework;

  const authChoice: AuthChoice = (await Select.prompt({
    message: "Choose your auth package",
    options: [
      { name: "Clerk", value: "clerk" },
      { name: "Better Auth", value: "better-auth" },
      { name: "None", value: "none" },
    ],
    default: "none",
  })) as AuthChoice;

  const dbChoice: DatabaseChoice = (await Select.prompt({
    message: "Choose your database",
    options: [
      { name: "Convex", value: "convex" },
      { name: "Drizzle", value: "drizzle" },
      { name: "None", value: "none" },
    ],
    default: "none",
  })) as DatabaseChoice;

  const toolingSelections: readonly string[] = await Checkbox.prompt({
    message: "Choose your tooling",
    options: [
      { name: "Tanstack Query", value: "tanstack-query" },
      { name: "Tanstack Form", value: "tanstack-form" },
      { name: "shadcn", value: "shadcn" },
      { name: "React Email", value: "react-email" },
      { name: "Resend", value: "resend" },
    ],
    default: [],
    confirmSubmit: false,
  });

  const useShadcn = toolingSelections.includes("shadcn");
  const useTanstackQuery = toolingSelections.includes("tanstack-query");
  const useTanstackForm = toolingSelections.includes("tanstack-form");
  const useReactEmail = toolingSelections.includes("react-email");
  const useResend = toolingSelections.includes("resend");

  let shadcnColor: string | null = null;
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

  // STEP 3: Summary
  console.log("\n📋 Summary of selections:");
  console.log(
    `  Framework: ${framework === "next" ? "Next JS" : "TanStack Start"}`,
  );
  if (authChoice !== "none") {
    console.log(`  ✓ ${authChoice === "clerk" ? "Clerk" : "Better Auth"}`);
  }
  if (dbChoice !== "none") {
    console.log(`  ✓ ${dbChoice === "convex" ? "Convex" : "Drizzle"}`);
  }
  if (useShadcn) {
    console.log(`  ✓ shadcn/ui with all components (${shadcnColor} theme)`);
  }
  if (useReactEmail) console.log("  ✓ React Email");
  if (useResend) console.log("  ✓ Resend");
  if (useTanstackQuery) console.log("  ✓ Tanstack Query");
  if (useTanstackForm) console.log("  ✓ Tanstack Form");

  // STEP 4: Scaffold selected framework
  if (framework === "next") {
    console.log("\n⚙️  Creating Next.js app...");
    run(
      `pnpm dlx create-next-app@latest ${projectName} --app --ts --tailwind --eslint --turbopack --src-dir --use-pnpm --import-alias @/*`,
    );
  } else {
    console.log("\n⚙️  Creating TanStack Start app...");
    run(`pnpm create @tanstack/start@latest ${projectName}`);
  }

  // STEP 5: Change to project directory
  Deno.chdir(projectName);

  // STEP 6: Install selected dependencies
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
  if (authChoice === "clerk") {
    deps.push(framework === "next" ? "@clerk/nextjs" : "@clerk/clerk-react");
  }
  if (authChoice === "better-auth") deps.push("better-auth");

  // DB
  if (dbChoice === "convex") deps.push("convex");
  if (dbChoice === "drizzle") deps.push("drizzle-orm");

  // Email stacks
  if (useReactEmail) {
    deps.push("@react-email/components", "@react-email/render");
  }
  if (useResend) deps.push("resend");

  // Tools
  if (useTanstackQuery) deps.push("@tanstack/react-query");
  if (useTanstackForm) deps.push("@tanstack/react-form");

  if (deps.length > 0) {
    console.log("\n📦 Installing selected dependencies with pnpm...");
    run(`pnpm add ${deps.join(" ")}`);
  }

  // STEP 7: Post-install setup
  if (useShadcn && framework === "next") {
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
  } else if (useShadcn) {
    console.log(
      "\nℹ️  shadcn automation currently targets Next.js. Skipping for TanStack Start.",
    );
  }

  // STEP 8: Open project in VS Code (optional)
  try {
    run("code .", { silent: true });
    console.log("\n🧰 Opened in VS Code (code .).");
  } catch (_e) {
    console.log(
      "\nℹ️  VS Code command-line tool not found. To open the project, run:",
    );
    console.log(`   cd ${projectName} && code .`);
  }

  // STEP 9: Completion + next steps
  console.log("\n✅ Done! Your app is ready.");
  console.log("\nNext steps:");
  console.log(`  cd ${projectName}`);
  console.log("  pnpm dev");
}

await new Command()
  .name("create-ekko-app")
  .version("1.0.0")
  .description(
    "Opinionated wrapper around create-next-app that installs your preferred stack in one go.",
  )
  .arguments("[name:string]")
  .action(async (_options, name?: string) => {
    await main(name);
  })
  .parse(Deno.args);
