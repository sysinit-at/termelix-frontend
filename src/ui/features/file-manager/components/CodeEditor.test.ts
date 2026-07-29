import { describe, it, expect } from "vitest";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";

import { resolveLanguageName } from "./CodeEditor";

/**
 * `langs` is keyed by extension. The previous map translated to language NAMES first, and ten of
 * them were not keys, so the most commonly edited files opened unhighlighted. Resolving to a name
 * is only half the job — `loadLanguage` has to return an extension for it — so both are asserted.
 */
function grammarFor(filename: string) {
  const name = resolveLanguageName(filename);
  return name ? loadLanguage(name) : null;
}

describe("CodeEditor language resolution", () => {
  it("highlights the files the old map silently dropped", () => {
    for (const filename of [
      "app.js",
      "main.ts",
      "Program.cs",
      "script.rb",
      "lib.rs",
      "deploy.sh",
      "profile.zsh",
      "sshd.conf",
      "Gemfile",
      "Rakefile",
    ]) {
      expect(grammarFor(filename), filename).not.toBeNull();
    }
  });

  it("still highlights what the old map got right", () => {
    for (const filename of [
      "index.html",
      "style.css",
      "data.json",
      "main.py",
      "App.tsx",
      "config.yaml",
      "config.yml",
      "Cargo.toml",
      "query.sql",
      "README.md",
    ]) {
      expect(grammarFor(filename), filename).not.toBeNull();
    }
  });

  it("picks up grammars the hand-written map never listed", () => {
    for (const filename of ["init.lua", "App.swift", "Main.kt", "shell.nix"]) {
      expect(grammarFor(filename), filename).not.toBeNull();
    }
  });

  it("returns null rather than a near-miss grammar", () => {
    // No grammar ships for either; colouring a Makefile as shell would be worse than plain text.
    expect(resolveLanguageName("Dockerfile")).toBeNull();
    expect(resolveLanguageName("Makefile")).toBeNull();
    expect(resolveLanguageName("notes.unknownext")).toBeNull();
    expect(resolveLanguageName("noextension")).toBeNull();
  });

  it("is case-insensitive about the filename", () => {
    expect(grammarFor("MAIN.TS")).not.toBeNull();
    expect(grammarFor("GEMFILE")).not.toBeNull();
  });
});
