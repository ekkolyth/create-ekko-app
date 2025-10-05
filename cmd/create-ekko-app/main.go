package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func main() {
	projectName, err := getProjectName()
	if err != nil {
		fmt.Println("\n❌ Setup was cancelled or ran in a non-interactive shell. Exiting.\n")
		return
	}

	useShadcn, shadcnColor, useClerk, useConvex, useEmail, err := collectFollowUps()
	if err != nil {
		fmt.Println("\n❌ Follow-up prompts were cancelled. Skipping extra setup.")
		return
	}

	fmt.Println("\n📋 Summary of selections:")
	if useShadcn {
		fmt.Printf("  ✓ shadcn/ui with all components (%s theme)\n", shadcnColor)
	}
	if useClerk {
		fmt.Println("  ✓ Clerk authentication")
	}
	if useConvex {
		fmt.Println("  ✓ Convex database")
	}
	if useEmail {
		fmt.Println("  ✓ Email services (react-hook-form, react-email, resend)")
	}

	fmt.Println("\n⚙️  Creating Next.js app with create-next-app...")
	if err := runCommand("pnpm", "dlx", "create-next-app@latest", projectName); err != nil {
		fmt.Fprintf(os.Stderr, "Error running create-next-app: %v\n", err)
		os.Exit(1)
	}

	// Change to project directory
	if err := os.Chdir(projectName); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to change directory to %s: %v\n", projectName, err)
		os.Exit(1)
	}

	// Install selected dependencies
	deps := make([]string, 0, 12)
	if useShadcn {
		deps = append(deps,
			"class-variance-authority",
			"clsx",
			"tailwindcss-animate",
			"lucide-react",
			"tailwind-merge",
		)
	}
	if useClerk {
		deps = append(deps, "@clerk/nextjs")
	}
	if useConvex {
		deps = append(deps, "convex")
	}
	if useEmail {
		deps = append(deps, "react-hook-form", "@react-email/components", "@react-email/render", "resend")
	}

	if len(deps) > 0 {
		fmt.Println("\n📦 Installing selected dependencies with pnpm...")
		args := append([]string{"add"}, deps...)
		if err := runCommand("pnpm", args...); err != nil {
			fmt.Fprintf(os.Stderr, "Dependency installation failed: %v\n", err)
			os.Exit(1)
		}
	}

	// shadcn setup
	if useShadcn {
		fmt.Printf("\n✨ Initializing shadcn with %s theme (this may update Tailwind config and add components)...\n", shadcnColor)
		if err := runCommand("pnpm", "dlx", "shadcn@latest", "init", "-y", "--base-color", shadcnColor); err != nil {
			fmt.Println("\n⚠️  shadcn setup failed. You can run it later with:")
			fmt.Println("   pnpm dlx shadcn@latest init")
			fmt.Println("   pnpm dlx shadcn@latest add --all")
		} else {
			fmt.Println("\n🎨 Installing all available shadcn components...")
			if err := runCommand("pnpm", "dlx", "shadcn@latest", "add", "--all", "-y"); err != nil {
				fmt.Println("\n⚠️  Failed to install shadcn components. You can run it later with:")
				fmt.Println("   pnpm dlx shadcn@latest add --all")
			}
		}
	}

	// Try to open in VS Code
	if err := runCommandOptional("code", "."); err == nil {
		fmt.Println("\n🧰 Opened in VS Code (code .).")
	} else {
		fmt.Println("\nℹ️  VS Code command-line tool not found. To open the project, run:")
		fmt.Printf("   cd %s && code .\n", projectName)
	}

	fmt.Println("\n✅ Done! Your app is ready.")
	fmt.Println("\nNext steps:")
	fmt.Printf("  cd %s\n", projectName)
	fmt.Println("  pnpm dev")
}

func getProjectName() (string, error) {
	if len(os.Args) > 1 {
		return os.Args[1], nil
	}
	if !isInteractive() {
		return "", errors.New("non-interactive")
	}
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("What is your project called? (my-app): ")
		text, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		name := strings.TrimSpace(text)
		if name == "" {
			name = "my-app"
		}
		if name != "" {
			return sanitizeProjectName(name), nil
		}
	}
}

func collectFollowUps() (useShadcn bool, shadcnColor string, useClerk bool, useConvex bool, useEmail bool, err error) {
	if !isInteractive() {
		// Defaults if non-interactive and no args; but per Node behavior, we should exit earlier
		return false, "", false, false, false, errors.New("non-interactive")
	}
	reader := bufio.NewReader(os.Stdin)

	useShadcn, err = promptYesNo(reader, "Would you like to use shadcn?", true)
	if err != nil {
		return
	}

	colors := []string{"neutral", "gray", "zinc", "stone", "slate"}
	shadcnColor, err = promptSelect(reader, "What base color would you like for shadcn?", colors, 0)
	if err != nil {
		return
	}

	useClerk, err = promptYesNo(reader, "Would you like to use clerk?", false)
	if err != nil {
		return
	}

	useConvex, err = promptYesNo(reader, "Would you like to use convex?", false)
	if err != nil {
		return
	}

	useEmail, err = promptYesNo(reader, "Would you like to install email services?", true)
	if err != nil {
		return
	}

	return
}

func promptYesNo(reader *bufio.Reader, question string, def bool) (bool, error) {
	defText := "y/N"
	if def {
		defText = "Y/n"
	}
	for {
		fmt.Printf("%s [%s]: ", question, defText)
		text, err := reader.ReadString('\n')
		if err != nil {
			return false, err
		}
		ans := strings.TrimSpace(strings.ToLower(text))
		if ans == "" {
			return def, nil
		}
		if ans == "y" || ans == "yes" {
			return true, nil
		}
		if ans == "n" || ans == "no" {
			return false, nil
		}
		fmt.Println("Please answer 'y' or 'n'.")
	}
}

func promptSelect(reader *bufio.Reader, question string, options []string, defaultIndex int) (string, error) {
	fmt.Println(question)
	for i, opt := range options {
		fmt.Printf("  %d) %s\n", i+1, capitalize(opt))
	}
	for {
		fmt.Printf("Select an option [default %d]: ", defaultIndex+1)
		text, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		ans := strings.TrimSpace(text)
		if ans == "" {
			return options[defaultIndex], nil
		}
		idx, convErr := parseIndex(ans, len(options))
		if convErr != nil {
			fmt.Println(convErr.Error())
			continue
		}
		return options[idx], nil
	}
}

func parseIndex(input string, length int) (int, error) {
	// Accept 1-based indexes
	var idx int
	switch input {
	case "1", "2", "3", "4", "5", "6", "7", "8", "9":
		idx = int(input[0]-'1')
	default:
		return 0, fmt.Errorf("Please enter a number between 1 and %d.", length)
	}
	if idx < 0 || idx >= length {
		return 0, fmt.Errorf("Please enter a number between 1 and %d.", length)
	}
	return idx, nil
}

func runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runCommandOptional(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = nil
	cmd.Stderr = nil
	cmd.Stdin = nil
	return cmd.Run()
}

func isInteractive() bool {
	fi, err := os.Stdin.Stat()
	if err != nil {
		return false
	}
	return (fi.Mode() & os.ModeCharDevice) != 0
}

func sanitizeProjectName(name string) string {
	name = strings.TrimSpace(name)
	name = strings.ToLower(name)
	// Replace spaces with dashes
	name = strings.ReplaceAll(name, " ", "-")
	// Remove path separators for safety
	name = filepath.Base(name)
	return name
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	runes := []rune(s)
	runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
	return string(runes)
}
