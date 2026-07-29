#!/usr/bin/env node
/**
 * Recompile the native modules for Node after a desktop build.
 *
 * `electron:rebuild` compiles `better-sqlite3` and `@serialport/bindings-cpp`
 * against Electron's ABI, which is what packaging needs and what the test suite
 * cannot load:
 *
 *     Error: The module '…/better_sqlite3.node' was compiled against a
 *     different Node.js version using NODE_MODULE_VERSION 148. This version of
 *     Node.js requires NODE_MODULE_VERSION 127.
 *
 * Measured: 177 tests across 40 files fail after `npm run build:mac-dev`, all of
 * them on that one dlopen. Nothing switches the modules back, so the suite stays
 * broken until someone works out why — and the obvious remedy does not work:
 *
 *     $ npm rebuild better-sqlite3
 *     npm warn rebuild 3 packages had install scripts blocked …
 *     rebuilt dependencies successfully          ← recompiled nothing
 *
 * It reports success while the install scripts that do the compiling are
 * blocked, which is the worst possible combination: the command a developer
 * reaches for prints the words they are looking for and leaves the tree exactly
 * as broken as it was.
 *
 * Calling node-gyp directly is what actually rebuilds them.
 *
 *     npm run rebuild:node
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODULES = ["better-sqlite3", "@serialport/bindings-cpp"];

let failed = false;

for (const name of MODULES) {
  const dir = path.join(__dirname, "..", "node_modules", ...name.split("/"));
  if (!fs.existsSync(dir)) {
    console.log(`[rebuild:node] ${name} not installed, skipping`);
    continue;
  }

  process.stdout.write(`[rebuild:node] ${name} … `);
  try {
    execFileSync("npx", ["node-gyp", "rebuild", "--release"], {
      cwd: dir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log("ok");
  } catch (error) {
    failed = true;
    console.log("FAILED");
    console.error(String(error.stderr ?? error.message).slice(0, 2000));
  }
}

// A failure here leaves the suite unable to load these modules, so it must not
// exit 0 — that is the mistake `npm rebuild` makes.
process.exit(failed ? 1 : 0);
