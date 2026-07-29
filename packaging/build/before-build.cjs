const path = require("path");

/**
 * Remove `cpu-features` before electron-builder rebuilds native modules.
 *
 * It is an optional ssh2 dependency (a CPU-detection speedup ssh2 works without)
 * whose published tarball omits the submodule its binding.gyp includes, so it
 * cannot build here at all — and any rebuild that walks into it kills the
 * packaging run:
 *
 *     gyp: buildcheck.gypi not found (cwd: node_modules/cpu-features)
 *
 * ## Why here and not only in an npm script
 *
 * The cleanup lived in `postinstall` first, which a tree installed with
 * `--ignore-scripts` never runs — and `scripts/build-frontend.sh` does exactly
 * that. Moving it into `electron:rebuild` covered the seven `build:*` scripts,
 * and only those: `npx electron-builder …` run directly skips them entirely and
 * hits `npmRebuild` with the module still in place.
 *
 * `beforeBuild` is the one point every electron-builder invocation passes
 * through, whatever launched it, and it runs before the dependency rebuild it
 * needs to protect.
 *
 * Returning true is load-bearing: a falsy return tells electron-builder to SKIP
 * its own install/rebuild, which is the per-architecture pass that gives x64 and
 * universal builds their own native binaries. Skipping it ships host-arch
 * binaries to every slice — measured once, on this project, as an arm64
 * `better_sqlite3.node` inside an x64 app.
 */
exports.default = async function beforeBuild() {
  const target = path.join(__dirname, "..", "..", "node_modules", "cpu-features");

  const fs = require("fs");
  if (fs.existsSync(target)) {
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log("[before-build] removed node_modules/cpu-features");
    } catch (error) {
      console.warn(
        "[before-build] could not remove node_modules/cpu-features:",
        error.message,
      );
    }
  }

  return true;
};
