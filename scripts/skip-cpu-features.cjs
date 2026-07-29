#!/usr/bin/env node
/**
 * Remove `cpu-features` after install, because it cannot be built here and does
 * not need to be.
 *
 * It is an OPTIONAL dependency of ssh2 — a CPU-detection speedup ssh2 works
 * without — and the published tarball omits the git submodule its binding.gyp
 * includes:
 *
 *     gyp: buildcheck.gypi not found (cwd: node_modules/cpu-features) while
 *     reading includes of deps/cpu_features/cpu_features.gyp
 *
 * npm tolerates that during install (optional deps are allowed to fail), so it
 * sits there unbuilt until something forces a rebuild — and then the macOS
 * desktop build dies before producing an app. Both rebuild passes hit it:
 * `electron:rebuild`, and electron-builder's own `npmRebuild`.
 *
 * ## Why not just switch electron-builder's rebuild off
 *
 * That was the first fix and it was wrong. electron-builder rebuilds native
 * modules once PER ARCHITECTURE, which is exactly what the release targets need
 * — `dmg` is built for universal, x64 and arm64, and `mas` for universal. With
 * `npmRebuild: false` it would have packaged whatever `electron-rebuild` left in
 * node_modules, which is host-arch only: measured, `better_sqlite3.node` was
 * arm64. Intel and universal builds would have shipped an arm64 binary and
 * crashed on launch — a broken release instead of a failed build, which is the
 * worse of the two by a distance.
 *
 * Removing the module keeps the per-arch rebuild doing its job and leaves it
 * nothing to trip over.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "cpu-features");

if (!fs.existsSync(target)) process.exit(0);

try {
  fs.rmSync(target, { recursive: true, force: true });
  console.log("[skip-cpu-features] removed node_modules/cpu-features");
} catch (error) {
  // Not fatal: the build only fails if something later tries to rebuild it, and
  // a loud failure there is better than pretending this step is mandatory.
  console.warn(
    "[skip-cpu-features] could not remove node_modules/cpu-features:",
    error.message,
  );
}
