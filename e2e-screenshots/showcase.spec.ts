import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import * as path from "node:path";

/**
 * Generates website screenshots by driving the real app against the seeded local stack.
 * Nothing is mocked at the app boundary: the fleet in the sidebar is fixture data
 * (`termEX/scripts/seed-e2e.sh`), and `web-01` is a real SSH host (the stack's own sshd),
 * so terminal content is genuinely rendered by xterm over the wire. What IS staged is the
 * terminal's content (`assets/showcase-session.sh`) — live output would leak the
 * workstation's processes and hostname into marketing material.
 *
 * These are not tests — assertions exist only to make sure a shot is not taken before the
 * UI it advertises is actually on screen. Ordering is deliberate: the terminal scenario
 * runs first so the dashboard scenario shows its session and activity.
 */

const USER = "admin";
const PASSWORD = "uFhh7A9AG13lXZw4g1lxLPp"; // showcase fixture, loopback-only stack
const OUT = "screenshots";
const SESSION_SCRIPT = path.join(__dirname, "assets", "showcase-session.sh");
const TMUX_SEED_SCRIPT = path.join(__dirname, "assets", "seed-tmux-sessions.sh");

// The generator runs on the same machine as the stack (documented in e2e/README.md), so
// staging the tmux sessions the shots rely on is part of the run, not a manual step.
test.beforeAll(() => {
  execFileSync("/bin/sh", [TMUX_SEED_SCRIPT], { stdio: "inherit" });
});

async function login(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("#login-user").fill(USER);
  await page.locator("#login-pass").fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  // The rail is the one post-login element that exists regardless of which panel the
  // server-side preferences last persisted.
  await expect(page.getByTitle("Hosts").first()).toBeVisible({ timeout: 30_000 });
  await dismissBlockingDialog(page);
}

/** Anything modal that opens over the shell on first login and would sit in every shot. */
async function dismissBlockingDialog(page: Page) {
  const later = page.getByRole("button", { name: /maybe later|close/i }).first();
  if (await later.isVisible().catch(() => false)) {
    await later.click();
    await page
      .locator('[data-slot="dialog-overlay"]')
      .first()
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
  }
}

/**
 * Selectors must not drift into the dashboard, which repeats every host name in its own
 * widgets (that failure mode produced screenshots of collapsed folders): a sidebar folder
 * row is the only BUTTON whose name starts with the folder name, and a sidebar host row is
 * the innermost context-menu trigger containing the exact host name.
 */
function folderRow(page: Page, folder: string) {
  return page.getByRole("button", { name: new RegExp(`^${folder}`) }).first();
}

function hostRow(page: Page, host: string) {
  return page
    .locator('[data-slot="context-menu-trigger"]')
    .filter({ has: page.getByText(host, { exact: true }) })
    .last();
}

/**
 * Sidebar state (which rail view is open, which folders are expanded) persists server-side
 * in user preferences, so every scenario builds the state it needs instead of trusting
 * what a previous run left behind.
 */
async function openHostsRail(page: Page) {
  // Panel-open is detected by its search box, NOT by a folder row: while the list is in its
  // "Loading hosts…" phase no folder exists yet, and a folder-based guard once concluded the
  // panel was closed and "opened" it by clicking… the toolbar's "Select hosts" button, which
  // getByTitle("Hosts") substring-matched. Selection mode then swallowed every double-click.
  const search = page.getByPlaceholder(/search hosts/i);
  if (!(await search.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "Hosts", exact: true }).first().click();
    await expect(search).toBeVisible({ timeout: 15_000 });
  }
  // Generous: the host list waits for /status, and without the lo0 aliases
  // (scripts/e2e-net-aliases.sh) that endpoint retries for ~20s before settling.
  await expect(folderRow(page, "Production")).toBeVisible({ timeout: 60_000 });
}

/** Expands a sidebar folder unless one of its member hosts is already showing. */
async function expandFolder(page: Page, folder: string, memberHost: string) {
  if (await hostRow(page, memberHost).isVisible().catch(() => false)) return;
  await folderRow(page, folder).click();
  await expect(hostRow(page, memberHost)).toBeVisible({ timeout: 10_000 });
}

async function openTerminal(page: Page, host: string) {
  await hostRow(page, host).dblclick();
  await page.locator(".xterm-screen, .xterm").first().waitFor({ timeout: 30_000 });
}

/** Everything currently rendered in the terminal viewport. */
async function screen(page: Page): Promise<string> {
  return page
    .locator(".xterm-rows")
    .first()
    .innerText()
    .catch(() => "");
}

async function typeLine(page: Page, line: string) {
  await page.locator(".xterm-helper-textarea").first().focus();
  await page.keyboard.type(line);
  await page.keyboard.press("Enter");
}

test("terminal with staged ops session", async ({ page }) => {
  await login(page);
  await openHostsRail(page);
  await expandFolder(page, "Production", "web-01");
  await openTerminal(page, "web-01");

  // Wait for a shell prompt before typing into it.
  await expect
    .poll(async () => (await screen(page)).length, { timeout: 30_000 })
    .toBeGreaterThan(0);

  await typeLine(page, `sh ${SESSION_SCRIPT}`);
  // The last line the script paints before blocking on `read`.
  await expect
    .poll(async () => await screen(page), { timeout: 30_000 })
    .toContain("/dev/nvme0n1p2");
  // One settle beat for xterm to finish painting colors and the cursor.
  await page.waitForTimeout(1_000);

  await page.screenshot({ path: `${OUT}/02-terminal.png` });
});

test("tmux monitor with a filled session list", async ({ page }) => {
  await login(page);
  await openHostsRail(page);
  await expandFolder(page, "Production", "web-01");

  await hostRow(page, "web-01").click({ button: "right" });
  const menu = page.locator('[data-slot="context-menu-content"]');
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await menu.getByText(/open tmux monitor/i).click();

  // The staged sessions (assets/seed-tmux-sessions.sh) listed for web-01. Match on .last():
  // the sessions column repeats the names, and the monitor's own tree renders after it.
  await expect(page.getByText("deploy-prod").last()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("db-migration").last()).toBeVisible();

  // Fill the preview panel: select the release window's own pane — the first pane row
  // rendered BELOW the window node. The labels are split across text nodes, so XPath
  // text() never matches, and positional nth() broke the moment the tree re-rendered;
  // geometry is what actually defines "the pane under this window".
  const releaseBox = await page.getByText("1: release").last().boundingBox();
  const paneRows = page.getByText("1: tail");
  for (let i = 0; i < (await paneRows.count()); i++) {
    const box = await paneRows.nth(i).boundingBox();
    if (box && releaseBox && box.y > releaseBox.y) {
      await paneRows.nth(i).click();
      break;
    }
  }
  await expect
    .poll(async () => await screen(page), { timeout: 30_000 })
    .toContain("Deploy complete");
  await page.waitForTimeout(1_000);

  await page.screenshot({ path: `${OUT}/03-tmux-monitor.png` });
});

test("host fleet and dashboard", async ({ page }) => {
  await login(page);
  await openHostsRail(page);
  await expandFolder(page, "Production", "web-01");
  await expandFolder(page, "Staging", "staging-app");
  await expandFolder(page, "Infrastructure", "build-runner-1");

  await expect(hostRow(page, "db-primary")).toBeVisible();
  await expect(hostRow(page, "backup-vault")).toBeVisible();

  await page.screenshot({ path: `${OUT}/01-host-fleet.png` });
});
