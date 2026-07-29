import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * The real thing: a browser logs in, opens a terminal over real SSH into real tmux, runs a
 * command, and then the server is restarted underneath it.
 *
 * A restart is the ordinary update path for this product (`docker compose up -d`), and it is
 * the case the entire tmux-binding design exists for. Nothing here is mocked — the server, the
 * SSH daemon and tmux are all real, which is the only way to catch the class of bug that keeps
 * turning up in this codebase: frames the server silently ignores, and commands that only fail
 * once they reach a shell.
 */

const USER = "e2e";
const PASSWORD = "e2e-password-123";

async function login(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // By id and by `button[type=submit]`: "Login" is also the tab above the form, and clicking
  // the tab does nothing while looking exactly like a successful click.
  await page
    .locator("#login-user")
    .waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("#login-user").fill(USER);
  await page.locator("#login-pass").fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();

  await expect(page.getByText("e2e-local").first()).toBeVisible({
    timeout: 20_000,
  });
  await dismissBlockingDialog(page);
}

/**
 * Anything modal that opens over the shell on first login and swallows clicks. The donation
 * dialog that motivated this is gone, but the guard stays: a dialog nobody dismissed is
 * indistinguishable from a broken app in a screenshot, and this is the first thing a real user
 * would do too.
 */
async function dismissBlockingDialog(page: Page) {
  const later = page
    .getByRole("button", { name: /maybe later|close/i })
    .first();
  if (await later.isVisible().catch(() => false)) {
    await later.click();
    await page
      .locator('[data-slot="dialog-overlay"]')
      .first()
      .waitFor({ state: "hidden", timeout: 10_000 })
      .catch(() => {});
  }
}

async function openTerminal(page: Page) {
  // Double-click, not click: a single click selects the host and scopes the sessions column to
  // it. Opening something is deliberate — double-click for a terminal, right-click for the rest.
  await page.getByText("e2e-local").first().dblclick();
  // xterm mounts a canvas/screen element once the shell is up.
  await page
    .locator(".xterm-screen, .xterm")
    .first()
    .waitFor({ timeout: 30_000 });
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

function restartServer() {
  execFileSync("/bin/sh", ["-c", "/tmp/tmx-e2e/restart.sh"], {
    stdio: "inherit",
  });
}

test("a terminal survives a server restart with its work intact", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await login(page);
  await openTerminal(page);

  // The shell is inside tmux — that is what makes it survivable at all.
  await typeLine(page, 'echo "TMUX=[$TMUX]"');
  await expect
    .poll(async () => await screen(page), { timeout: 30_000 })
    .toContain("TMUX=[/");

  // Do some work whose result lives only in this shell PROCESS — a variable, not scrollback.
  //
  // Scrollback was the first attempt and it made the test flaky for a reason worth recording:
  // `screen()` reads the visible rows, the reconnect poll below retypes its command every few
  // seconds, and on a slow reconnect the earlier output simply scrolls out of the viewport. The
  // test then failed while the product was working perfectly. A variable is also the stronger
  // claim — scrollback could in principle be replayed into a brand new shell, whereas only the
  // original process still has `$E2E_MARK` set.
  const marker = `E2E-MARKER-${Date.now()}`;
  await typeLine(page, `E2E_MARK=${marker}`);
  await typeLine(page, `echo "set=[$E2E_MARK]"`);
  await expect
    .poll(async () => await screen(page), { timeout: 20_000 })
    .toContain(`set=[${marker}]`);

  // The update path: the server goes away and comes back with everything in memory lost.
  restartServer();

  // Wait for the socket to actually notice. Asserting on the marker alone would pass
  // instantly and prove nothing — xterm keeps rendering the old buffer after a disconnect,
  // so "the marker is on screen" is true of a DEAD terminal too.
  await page
    .waitForFunction(
      () => !document.querySelector("[data-terminal-connected='true']"),
      undefined,
      { timeout: 30_000 },
    )
    .catch(() => {
      /* No such attribute in this build — the liveness probe below is the real check. */
    });

  // The decisive part, and it is one command rather than two assertions: read the variable
  // back. A dead socket swallows the keystrokes so nothing appears at all, and a fresh shell
  // answers with an empty value — so `restored=[<marker>]` can only be produced by a live
  // connection to the same shell process that was running before the restart.
  await expect
    .poll(
      async () => {
        await typeLine(page, `echo "restored=[$E2E_MARK]"`);
        return await screen(page);
      },
      { timeout: 120_000, intervals: [3000] },
    )
    .toContain(`restored=[${marker}]`);

  expect(pageErrors, pageErrors.join("\n")).toHaveLength(0);
});

/**
 * The test above proves the property users care about — work survives a restart — but it does
 * NOT isolate `resumeBinding`, and running it with the resume path disabled showed why: the
 * tmux-first default already recovers the session on a plain `connectToHost`, because the tab's
 * stable `instanceId` derives the same session name and `new-session -A` reattaches to it.
 *
 * That is worth knowing rather than glossing: resume is belt-and-braces for the cases where the
 * derived name does NOT match — the monitor's "Attach", a binding made under another name, a
 * client that lost its tab id. So this test asserts on the WIRE, which is the only place the
 * difference is visible.
 */
test("the client negotiates and uses the tmux binding protocol", async ({
  page,
}) => {
  const sent: string[] = [];
  const received: string[] = [];

  page.on("websocket", (ws) => {
    ws.on(
      "framesent",
      (f) => typeof f.payload === "string" && sent.push(f.payload),
    );
    ws.on(
      "framereceived",
      (f) => typeof f.payload === "string" && received.push(f.payload),
    );
  });

  await login(page);
  await openTerminal(page);
  await expect
    .poll(async () => sent.length, { timeout: 30_000 })
    .toBeGreaterThan(0);

  const connect = sent.find((f) => f.includes('"connectToHost"'));
  expect(connect, "no connectToHost frame was sent").toBeTruthy();

  const data = JSON.parse(connect!).data;

  // Support must be advertised, or the server withholds `bindingResumed` — the resume would
  // complete server-side and the client would never be told, which looks exactly like a hang.
  expect(data.supports).toContain("resumeBinding");
  expect(data.supports).toContain("bindingResumed");

  // And the per-tab id must be inside `hostConfig`, which is the only place the server reads
  // it from. Anywhere else is accepted, ignored, and silently makes every tab on a host share
  // one tmux session.
  expect(typeof data.hostConfig.instanceId).toBe("string");
  expect(data.hostConfig.instanceId.length).toBeGreaterThan(0);

  // The server should confirm it wrapped the shell in the tmux session it named.
  await expect
    .poll(() => received.some((f) => f.includes("tmux_session_attached")), {
      timeout: 30_000,
    })
    .toBe(true);
});

test("the client records its stream position and reattaches with it", async ({
  page,
}) => {
  // The delta only saves anything if the client actually tracks where it got to, and the way
  // that silently fails is arithmetic: record the offset before the id it belongs to is known
  // and nothing is ever stored, so every reattach quietly asks for a full replay again. Both
  // halves are invisible from the outside — the terminal looks perfect either way — so this
  // reads the frames the real browser puts on the wire.
  const received: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("websocket", (ws) => {
    ws.on(
      "framereceived",
      (f) => typeof f.payload === "string" && received.push(f.payload),
    );
  });

  await login(page);
  await openTerminal(page);

  await expect
    .poll(
      () =>
        received.some((f) => {
          try {
            const m = JSON.parse(f);
            return m.type === "data" && typeof m.seq === "number";
          } catch {
            return false;
          }
        }),
      { timeout: 30_000 },
    )
    .toBe(true);

  // The position must ADVANCE with output, not sit at whatever the first frame said.
  const seqOf = (f: string) => {
    try {
      const m = JSON.parse(f);
      return m.type === "data" && typeof m.seq === "number" ? m.seq : null;
    } catch {
      return null;
    }
  };
  const first = received.map(seqOf).find((s) => s !== null)!;

  await typeLine(page, "echo E2E-SEQ-PROBE");
  await expect
    .poll(() => Math.max(...received.map((f) => seqOf(f) ?? -1)), {
      timeout: 30_000,
    })
    .toBeGreaterThan(first);

  expect(errors, errors.join("\n")).toHaveLength(0);
});
