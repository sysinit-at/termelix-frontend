#!/usr/bin/env node
/**
 * Type-check the SPA and fail only if it got WORSE.
 *
 * `npm run type-check` was `tsc --noEmit`, which resolves the root `tsconfig.json` — a
 * solution-style config with `"files": []` and only `references`. It checked ZERO files and exited
 * 0, forever. Meanwhile `tsc -p tsconfig.app.json` reported errors that were real user-visible
 * defects: a component calling `t` with no `useTranslation()` in scope (a runtime ReferenceError),
 * a required `isAdmin` prop never passed (a menu entry nobody could see), an extension-to-language
 * map whose values were not valid keys (no syntax highlighting for js/ts/sh/rb/rs/cs).
 *
 * Fixing all of them at once is not on. A ratchet is: the baseline below is the count on the day
 * it was written, and this fails if the count rises. Lower it whenever you fix some — the script
 * prints the command when you do.
 *
 * Deliberately counts errors rather than listing allowed ones. A per-error allowlist has to be
 * regenerated on every edit, which turns into `--force`-ing it, and a stale allowlist reads like
 * something is checked when it isn't. That is the failure mode this replaces.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_FILE = join(ROOT, "scripts", "type-check-baseline.json");
const PROJECT = "tsconfig.app.json";

function typeErrorCount() {
  try {
    execFileSync("npx", ["tsc", "-p", PROJECT, "--noEmit"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { count: 0, output: "" };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    const count = output
      .split("\n")
      .filter((line) => /error TS\d+:/.test(line)).length;

    // tsc failed without producing parseable diagnostics — a missing binary, a broken config.
    // Reporting "0 errors" here would be the same silent pass this script exists to end.
    if (count === 0) {
      console.error(output || "tsc failed with no output");
      process.exit(1);
    }
    return { count, output };
  }
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
const { count, output } = typeErrorCount();

if (count > baseline.errors) {
  console.error(output);
  console.error(
    `\ntype-check ratchet: ${count} errors, up from ${baseline.errors}.\n` +
      `New type errors are how the last batch of user-visible defects got in. Fix them, or\n` +
      `explain in the commit why the baseline should move the wrong way.`,
  );
  process.exit(1);
}

if (count < baseline.errors) {
  if (process.argv.includes("--update")) {
    writeFileSync(
      BASELINE_FILE,
      `${JSON.stringify({ ...baseline, errors: count }, null, 2)}\n`,
    );
    console.log(`type-check ratchet: baseline lowered to ${count}.`);
  } else {
    console.log(
      `type-check ratchet: ${count} errors, down from ${baseline.errors}. ` +
        `Lock it in with \`npm run type-check -- --update\`.`,
    );
  }
} else {
  console.log(`type-check ratchet: ${count} errors, unchanged.`);
}
