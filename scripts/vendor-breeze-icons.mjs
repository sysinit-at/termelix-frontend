#!/usr/bin/env node
/**
 * Vendor the Breeze (KDE/Dolphin) icons the file manager uses into
 * src/ui/assets/icons/breeze/.
 *
 * Breeze is not published to npm, so the SVGs are checked in. This script is how they are
 * refreshed: it resolves each icon against a breeze-icons checkout, copies it under a flat
 * semantic name, and records provenance (branch + commit) in NOTICE.md so the vendored set is
 * auditable and reproducible.
 *
 *   node scripts/vendor-breeze-icons.mjs                       # clones upstream into a temp dir
 *   node scripts/vendor-breeze-icons.mjs --source /path/to/co  # uses an existing checkout
 *
 * Each icon is resolved from a ranked candidate list rather than a single hard-coded path:
 * upstream renames and moves icons between size buckets, and a silent fallback to a generic
 * glyph is worse than a loud failure. Any unresolved entry aborts the run.
 *
 * Monochrome Breeze icons carry an embedded stylesheet that pins .ColorScheme-Text to the light
 * theme's near-black. The paths themselves use fill:currentColor, so stripping that stylesheet
 * makes them inherit the ambient CSS color instead — which is what lets the same asset work in
 * both light and dark mode, and lets Tailwind text-* classes tint them exactly as the lucide
 * icons they replace were tinted. Full-colour mimetype icons have no such block and pass through
 * untouched.
 *
 * Licence: Breeze icons are LGPL-3.0-or-later. COPYING-ICONS and COPYING.LIB are copied
 * alongside the SVGs; do not remove them.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM = "https://github.com/KDE/breeze-icons.git";
const BRANCH = "Frameworks/6.24";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const OUT_DIR = path.join(REPO_ROOT, "src/ui/assets/icons/breeze");

// Preferred size buckets, most preferred first. 22px is Breeze's toolbar size and the one with
// the widest coverage; 16 is the usual fallback for icons that only ship small.
const SIZES = ["22", "16", "32", "64"];
const CATEGORIES = [
  "actions",
  "places",
  "mimetypes",
  "status",
  "apps",
  "emblems",
  "devices",
  "categories",
];

/**
 * UI icons, keyed by the lucide name they replace so the call sites keep reading naturally.
 * Navigation (go-up/go-down) is deliberately kept distinct from transfer (cloud-*): upstream has
 * no plain upload.svg, and reusing go-up for both would make "parent directory" and "upload"
 * identical in the toolbar.
 */
const UI_ICONS = {
  ArrowUp: ["go-up"],
  ArrowDown: ["go-down"],
  ChevronUp: ["arrow-up"],
  ChevronDown: ["arrow-down"],
  ChevronLeft: ["arrow-left"],
  ChevronRight: ["arrow-right"],
  ArrowLeftRight: ["exchange-positions"],
  ArrowRightLeft: ["exchange-positions"],
  RefreshCw: ["view-refresh"],
  Search: ["edit-find"],
  List: ["view-list-details"],
  Grid3X3: ["view-list-icons"],
  Layout: ["view-split-left-right"],
  Copy: ["edit-copy"],
  Scissors: ["edit-cut"],
  Clipboard: ["edit-paste"],
  Trash2: ["edit-delete"],
  Edit: ["document-edit"],
  Edit3: ["edit-rename"],
  Move: ["edit-move"],
  Save: ["document-save"],
  Download: ["cloud-download"],
  Upload: ["cloud-upload"],
  FilePlus: ["document-new"],
  FolderPlus: ["folder-new"],
  Plus: ["list-add"],
  Minus: ["list-remove"],
  X: ["dialog-close"],
  RotateCcw: ["edit-undo"],
  GitCompare: ["vcs-diff"],
  Link: ["edit-link"],
  ExternalLink: ["window-new"],
  Bookmark: ["bookmarks"],
  Star: ["favorite"],
  Settings: ["configure"],
  Terminal: ["utilities-terminal"],
  Keyboard: ["input-keyboard"],
  Shield: ["security-high"],
  Lock: ["object-locked"],
  Eye: ["view-visible"],
  EyeOff: ["view-hidden"],
  ZoomIn: ["zoom-in"],
  ZoomOut: ["zoom-out"],
  Maximize2: ["view-fullscreen"],
  Minimize2: ["view-restore"],
  Play: ["media-playback-start"],
  Clock: ["clock"],
  Info: ["dialog-information"],
  AlertCircle: ["dialog-warning"],
  Archive: ["archive-insert"],
  Package: ["package-x-generic"],
  Folder: ["folder"],
  File: ["text-x-generic"],
  FileText: ["text-plain"],
  FileImage: ["image-x-generic"],
  Image: ["image-x-generic"],
  FileVideo: ["video-x-generic"],
  Film: ["video-x-generic"],
  FileAudio: ["audio-x-generic"],
  Music: ["audio-x-generic"],
  FileArchive: ["application-x-archive"],
  Code: ["text-x-script"],
  FileSymlink: ["emblem-symbolic-link"],
};

/** Extra mimetype icons used by the per-extension file-type mapping. */
const MIMETYPE_ICONS = [
  "text-markdown",
  "text-x-log",
  "application-pdf",
  "application-json",
  "application-xml",
  "application-x-shellscript",
  "text-x-python",
  "application-javascript",
  "text-x-java",
  "text-x-csrc",
  "text-x-chdr",
  "text-x-c++src",
  "text-x-c++hdr",
  "text-x-csharp",
  "application-x-php",
  "application-x-ruby",
  "text-x-go",
  "text-rust",
  "text-html",
  "text-css",
  "image-png",
  "image-jpeg",
  "image-gif",
  "image-bmp",
  "image-svg+xml",
  "video-mp4",
  "video-x-matroska",
  "audio-mpeg",
  "audio-x-wav",
  "audio-flac",
  "application-zip",
  "application-x-tar",
  "application-x-gzip",
  "application-x-bzip",
  "application-x-7z-compressed",
  "application-x-rar",
  "application-x-deb",
  "application-x-rpm",
  "application-x-cd-image",
  "application-x-sqlite3",
  "application-x-ms-dos-executable",
  "application-x-executable",
  "application-msword",
  "application-vnd.ms-excel",
  "x-office-presentation",
  "application-pgp-keys",
  "application-x-x509-ca-cert",
  "folder-open",
];

function resolveSource() {
  const flag = process.argv.indexOf("--source");
  if (flag !== -1 && process.argv[flag + 1]) {
    const dir = path.resolve(process.argv[flag + 1]);
    if (!fs.existsSync(path.join(dir, "icons"))) {
      throw new Error(
        `${dir} does not look like a breeze-icons checkout (no icons/ dir)`,
      );
    }
    return dir;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "breeze-icons-"));
  console.log(`Cloning ${UPSTREAM} (${BRANCH}) into ${tmp} …`);
  execFileSync(
    "git",
    ["clone", "--depth", "1", "--branch", BRANCH, "--quiet", UPSTREAM, tmp],
    { stdio: "inherit" },
  );
  return tmp;
}

function findIcon(sourceDir, name) {
  for (const size of SIZES) {
    for (const category of CATEGORIES) {
      const candidate = path.join(
        sourceDir,
        "icons",
        category,
        size,
        `${name}.svg`,
      );
      if (fs.existsSync(candidate)) {
        return { file: candidate, category, size };
      }
    }
  }
  return null;
}

/**
 * Drop the embedded colour-scheme stylesheet so fill:currentColor resolves against the ambient
 * CSS colour. Icons without such a block (the full-colour mimetypes) are returned unchanged.
 */
function neutraliseColorScheme(svg) {
  const withoutStyle = svg.replace(
    /<style[^>]*id="current-color-scheme"[\s\S]*?<\/style>/g,
    "",
  );
  return withoutStyle
    .replace(/<defs>\s*<\/defs>/g, "")
    .replace(/\n{3,}/g, "\n");
}

function main() {
  const sourceDir = resolveSource();
  const commit = execFileSync("git", ["-C", sourceDir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  const wanted = new Map();
  for (const candidates of Object.values(UI_ICONS)) {
    for (const name of candidates) wanted.set(name, candidates);
  }
  for (const name of MIMETYPE_ICONS) wanted.set(name, [name]);

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const written = [];
  const missing = [];

  for (const name of [...wanted.keys()].sort()) {
    const hit = findIcon(sourceDir, name);
    if (!hit) {
      missing.push(name);
      continue;
    }
    const svg = neutraliseColorScheme(fs.readFileSync(hit.file, "utf8"));
    // "+" is awkward in an import specifier: "text-x-c++src" -> "text-x-cxxsrc",
    // "image-svg+xml" -> "image-svg-xml".
    const outName = `${name.replace(/\+\+/g, "xx").replace(/\+/g, "-")}.svg`;
    fs.writeFileSync(path.join(OUT_DIR, outName), svg);
    written.push({ name, outName, category: hit.category, size: hit.size });
  }

  if (missing.length > 0) {
    throw new Error(
      `Unresolved Breeze icons (upstream renamed or removed them): ${missing.join(", ")}.\n` +
        "Fix the candidate lists in this script rather than letting call sites fall back silently.",
    );
  }

  for (const licence of ["COPYING-ICONS", "COPYING.LIB"]) {
    fs.copyFileSync(path.join(sourceDir, licence), path.join(OUT_DIR, licence));
  }

  const notice = [
    "# Breeze icons (vendored)",
    "",
    "The file manager uses the KDE Breeze icon theme — the icon set Dolphin ships with.",
    "Breeze is not published to npm, so the SVGs below are checked in.",
    "",
    "| | |",
    "| --- | --- |",
    `| Upstream | ${UPSTREAM} |`,
    `| Branch | \`${BRANCH}\` |`,
    `| Commit | \`${commit}\` |`,
    `| Icons | ${written.length} |`,
    "",
    "## Licence",
    "",
    "Breeze icons are licensed **LGPL-3.0-or-later**. The upstream licence texts are vendored",
    "alongside the assets as `COPYING-ICONS` and `COPYING.LIB`; do not remove them.",
    "",
    "Copyright (C) 2014 Uri Herrera <uri_herrera@nitrux.in> and others.",
    "",
    "## Modifications",
    "",
    "Monochrome icons had their embedded `current-color-scheme` stylesheet removed so that the",
    "`fill:currentColor` paths inherit the ambient CSS colour, making one asset work in both light",
    "and dark themes. No other changes. Full-colour mimetype icons are byte-identical to upstream.",
    "",
    "## Refreshing",
    "",
    "```sh",
    "node scripts/vendor-breeze-icons.mjs",
    "```",
    "",
    "## Vendored icons",
    "",
    "| File | Upstream path |",
    "| --- | --- |",
    ...written.map(
      (w) =>
        `| \`${w.outName}\` | \`icons/${w.category}/${w.size}/${w.name}.svg\` |`,
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(OUT_DIR, "NOTICE.md"), notice);

  console.log(
    `Vendored ${written.length} Breeze icons into ${path.relative(REPO_ROOT, OUT_DIR)}`,
  );
  console.log(`Upstream ${BRANCH} @ ${commit.slice(0, 12)}`);
}

main();
