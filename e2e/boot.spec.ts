import { expect, test } from "@playwright/test";

/**
 * What a cold browser actually does on load.
 *
 * These are the claims the startup work makes, checked against a running server rather than
 * against the build output — a chunk can be small on disk and still be fetched eagerly, and
 * compression configured in the endpoint does nothing if the files are not on disk.
 */

test("the app boots without a blank page or a console error", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/", { waitUntil: "networkidle" });

  // Something rendered. A failed chunk with no error boundary leaves #root empty, which is
  // exactly the failure the lazy-chunk work exists to prevent.
  const rootHtml = await page.locator("#root").innerHTML();
  expect(rootHtml.length).toBeGreaterThan(0);

  // Ignore noise the app cannot control (favicon, extension chatter).
  const real = errors.filter(
    (e) => !/favicon|net::ERR_FAILED.*extension/i.test(e),
  );
  expect(real, `console errors:\n${real.join("\n")}`).toHaveLength(0);
});

test("the eager JavaScript payload stays small and compressed", async ({
  page,
}) => {
  const js: { url: string; bytes: number; encoding: string }[] = [];

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.endsWith(".js")) return;
    const headers = res.headers();
    js.push({
      url: url.split("/").pop()!,
      bytes: Number(headers["content-length"] ?? 0),
      encoding: headers["content-encoding"] ?? "none",
    });
  });

  await page.goto("/", { waitUntil: "networkidle" });

  const total = js.reduce((n, f) => n + f.bytes, 0);
  const uncompressed = js.filter(
    (f) => f.encoding === "none" && f.bytes > 4096,
  );

  console.log(
    `  eager JS: ${js.length} files, ${(total / 1024).toFixed(0)} KB on the wire`,
  );

  // Was 3296 KB raw before the chunking and compression work. The bound is generous on
  // purpose — this guards against a regression of that KIND, not against a few KB of drift.
  expect(total).toBeLessThan(600 * 1024);

  // Every substantial asset must be compressed. `Plug.Static`'s gzip/brotli options serve a
  // sibling file only if one exists, and the container build did not make them for a long
  // time — the flag looked enabled and did nothing.
  expect(
    uncompressed.map((f) => f.url),
    "these shipped uncompressed",
  ).toHaveLength(0);
});

test("the code editor and file previewer are NOT fetched on boot", async ({
  page,
}) => {
  const fetched: string[] = [];
  page.on("request", (r) => fetched.push(r.url()));

  await page.goto("/", { waitUntil: "networkidle" });

  // 2.8 MB of CodeMirror and PDF/markdown viewers used to be `modulepreload`ed on every load
  // to support features most sessions never open.
  const heavy = fetched.filter((u) =>
    /(CodeEditor|MarkdownRenderer|PdfPreview|codemirror|file-preview-vendor)/i.test(
      u,
    ),
  );
  expect(heavy, `eagerly fetched:\n${heavy.join("\n")}`).toHaveLength(0);
});

test("the boot burst asks who the user is exactly once", async ({ page }) => {
  // Six components independently need the identity, and each opened its own round-trip:
  // `/users/me` three times per login and `/users/setup-required` twice, serial on the
  // critical path before anything rendered. Nothing about that is visible in a build or in a
  // unit test — the app is correct either way, just slower — so it is counted here, against a
  // real server, from the requests the browser actually makes.
  const calls: string[] = [];
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.endsWith("/users/me") || path.endsWith("/users/setup-required")) {
      calls.push(path);
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();

  // Settled: the host list is the last thing the boot sequence waits on.
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });

  const me = calls.filter((c) => c.endsWith("/users/me")).length;
  const setup = calls.filter((c) => c.endsWith("/users/setup-required")).length;
  console.log(
    `boot identity calls: /users/me x${me}, /users/setup-required x${setup}`,
  );

  // One apiece is the coalesced result. The bound is 2 rather than 1 because a login is
  // legitimately two auth epochs — anonymous, then authenticated — and the cache is cleared
  // between them on purpose; that invalidation is a security property, not overhead to trim.
  expect(me, `/users/me was fetched ${me} times`).toBeLessThanOrEqual(2);
  expect(
    setup,
    `/users/setup-required was fetched ${setup} times`,
  ).toBeLessThanOrEqual(2);
});

test("the API key screen talks to an endpoint that exists", async ({
  page,
}) => {
  // This is the whole bug in one assertion. The client called `/users/api-keys`, a leftover
  // from the Node implementation that this server does not route, so every request 404'd and
  // the API-key UI was dead — while looking like an ordinary request failure. Nothing in a
  // build, a type-check or a unit test can see a wrong URL string; only a real server can.
  const calls: { path: string; status: number }[] = [];
  page.on("response", async (r) => {
    const path = new URL(r.url()).pathname;
    if (path.includes("api-keys")) calls.push({ path, status: r.status() });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });

  // Open the panel that fetches the list. This navigation is the test: without it `calls`
  // stays empty, the loop below iterates nothing, and the whole thing passes against a client
  // that never made a request — which is exactly what happened on the first attempt here, and
  // is why the control run (restoring the 404 path) wrongly went green.
  // The rail is icon-only, so the label span is present but collapsed to zero width. Click the
  // button that contains it rather than the span, which is not actionable.
  await page
    .locator("button", { hasText: "User Profile" })
    .first()
    .click({ timeout: 30_000 });

  await expect.poll(() => calls.length, { timeout: 30_000 }).toBeGreaterThan(0);

  for (const call of calls) {
    expect(call.path, `${call.path} is the retired Node path`).not.toContain(
      "/users/api-keys",
    );
    expect(call.status, `${call.path} returned ${call.status}`).toBeLessThan(
      400,
    );
  }

  // Belt and braces: hit the endpoint the client now uses, with the session cookie the browser
  // already holds, and require the shape the UI destructures.
  const body = await page.evaluate(async () => {
    const res = await fetch("/api-keys", { credentials: "include" });
    return { status: res.status, json: await res.json().catch(() => null) };
  });

  expect(body.status, "GET /api-keys").toBe(200);
  expect(Array.isArray(body.json?.keys), "response.keys must be an array").toBe(
    true,
  );
  // The picker is built from this, so an empty list would render a create form with no
  // selectable scope and a create button that always 400s.
  expect(body.json?.availableScopes?.length, "availableScopes").toBeGreaterThan(
    0,
  );

  // Put the rail back. Which panel is open is persisted SERVER-SIDE in user preferences, not in
  // this browser context, so Playwright's fresh-context-per-test does not undo it: leaving the
  // profile panel selected makes the NEXT test open to a screen with no host list, and its
  // keystrokes go nowhere. Restoring here fixes the leak at the source rather than making every
  // other test defend against it.
  await page.locator("button", { hasText: "Hosts" }).first().click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });
});

test("the browser subscribes to /events and receives a live frame", async ({
  page,
}) => {
  // A stream that connects and delivers nothing is this feature's worst failure mode, and it is
  // invisible from every other angle: the socket is open, no error is logged, and the UI simply
  // never updates. Nothing but a real server can distinguish "subscribed" from "working", so
  // this asserts on a frame actually arriving.
  // Collected from before the first navigation, because the app subscribes as it mounts. Both
  // `waitForRequest` and `waitForResponse` failed here for different reasons and neither was the
  // product's fault: the response event never fires for a stream whose body does not end, and a
  // request wait registered after login starts listening once the request has already gone.
  const eventRequests: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.endsWith("/events")) {
      eventRequests.push(r.url());
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });

  await expect
    .poll(() => eventRequests.length, { timeout: 30_000 })
    .toBeGreaterThan(0);

  // Exactly one. A stream is a held connection and the server allows 8 per user, reclaiming
  // abandoned ones only on its heartbeat — so an effect that re-subscribes on every callback
  // identity change burns through that budget and can lock the user out of their own push
  // channel. This caught precisely that: two subscriptions per page load.
  expect(eventRequests.length, `subscribed ${eventRequests.length} times`).toBe(
    1,
  );

  // The frames themselves — which also settles the content type, since EventSource delivers
  // named events only for `text/event-stream`. `ready` is sent once, before any state, so receiving it proves
  // the stream is live rather than merely accepted — read with a bare EventSource so the
  // assertion does not depend on the app's own handlers.
  const ready = await page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const source = new EventSource("/events", { withCredentials: true });
        const timer = setTimeout(() => {
          source.close();
          resolve(null);
        }, 20_000);
        source.addEventListener("ready", (event) => {
          clearTimeout(timer);
          source.close();
          resolve((event as MessageEvent).data);
        });
      }),
  );

  expect(ready, "no `ready` frame arrived on /events").not.toBeNull();
  expect(JSON.parse(ready as string).userId, "ready.userId").toBeTruthy();
});

test("the create-key dialog reveals the one-time token on screen", async ({
  page,
}) => {
  // The bug: the panel received the plaintext token, pushed it into list state, and rendered it
  // nowhere. Creating a key therefore SUCCEEDED while silently destroying the credential — the
  // server shows the token exactly once and keeps only a hash, so the user was left holding a
  // key they could never use with nothing to say anything was wrong. Every unit test and
  // type-check passes either way; only driving the real UI can tell.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });

  await page
    .locator("button", { hasText: "User Profile" })
    .first()
    .click({ timeout: 30_000 });

  // The panel is an accordion defaulting to "account", so the section has to be opened before
  // its controls exist in the DOM at all.
  await page
    .getByText("API Keys", { exact: true })
    .first()
    .click({ timeout: 30_000 });

  await page
    .locator("button", { hasText: "New Key" })
    .first()
    .click({ timeout: 30_000 });

  const name = `e2e-ui-token-${Date.now()}`;
  await page.getByPlaceholder("e.g. CI Pipeline").first().fill(name);
  // Scopes are mandatory server-side; submitting with none is a 400, not a token.
  await page.locator('input[type="checkbox"]').first().check();
  await page.locator("button", { hasText: "Create Key" }).first().click();

  // The token must be VISIBLE, not merely in memory.
  const token = page.locator("code", { hasText: /^tmx_/ }).first();
  await expect(token).toBeVisible({ timeout: 30_000 });
  const shown = (await token.textContent()) ?? "";
  expect(shown.startsWith("tmx_"), `showed ${shown}`).toBe(true);

  // And a stray click outside must not discard it — dismissing loses the credential for good.
  await page.mouse.click(5, 5);
  await expect(token).toBeVisible();

  await page.locator("button", { hasText: "Done" }).first().click();
  await expect(token).toBeHidden({ timeout: 10_000 });

  // Clean up the key this test minted.
  await page.evaluate(async (keyName) => {
    const res = await fetch("/api-keys", { credentials: "include" });
    const body = await res.json();
    const match = (body.keys ?? []).find(
      (k: { name: string; id: string }) => k.name === keyName,
    );
    if (match) {
      await fetch(`/api-keys/${match.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    }
  }, name);

  // Leave the rail as we found it — the view is persisted server-side.
  await page.locator("button", { hasText: "Hosts" }).first().click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });
});

test("the one-time token is never re-readable from the server", async ({
  page,
}) => {
  // The bug this covers: the panel received the plaintext token, pushed it into list state, and
  // never rendered it anywhere. Creating a key therefore SUCCEEDED and silently destroyed the
  // credential — the server shows the token exactly once and stores only a hash, so the user
  // ended up holding a key they could never use, with nothing to indicate anything was wrong.
  // Every unit test and type-check passes either way; only looking at the screen can tell.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });

  const created = await page.evaluate(async () => {
    const res = await fetch("/api-keys", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `e2e-token-probe-${Date.now()}`,
        scopes: ["tmux:read"],
        hostIds: [],
      }),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  });

  expect(created.status, "POST /api-keys").toBe(200);
  const token: string = created.json?.token;

  // The contract the UI depends on: a `tmx_` prefixed plaintext that appears exactly once.
  expect(token, "no token in the create response").toBeTruthy();
  expect(token.startsWith("tmx_"), `token was ${token}`).toBe(true);

  // And it must never come back. If it did, "shown once" would be a UI convention rather than a
  // property of the server, and losing it would not matter.
  const listed = await page.evaluate(async () => {
    const res = await fetch("/api-keys", { credentials: "include" });
    return await res.text();
  });
  expect(listed, "the plaintext token must not be re-readable").not.toContain(
    token,
  );

  // Clean up: this key exists only to prove the token flow.
  await page.evaluate(async (id) => {
    await fetch(`/api-keys/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
  }, created.json?.key?.id);
});
