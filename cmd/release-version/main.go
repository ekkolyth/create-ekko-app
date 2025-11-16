package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type releaseInfo struct {
	Version string `json:"version"`
}

func main() {
	data, err := os.ReadFile(".github/release.json")
	if err != nil {
		fmt.Fprintln(os.Stderr, "read .github/release.json:", err)
		os.Exit(1)
	}

	var info releaseInfo
	if err := json.Unmarshal(data, &info); err != nil {
		fmt.Fprintln(os.Stderr, "parse .github/release.json:", err)
		os.Exit(1)
	}

	if info.Version == "" {
		fmt.Fprintln(os.Stderr, ".github/release.json: version is empty")
		os.Exit(1)
	}

	fmt.Println(info.Version)
}


