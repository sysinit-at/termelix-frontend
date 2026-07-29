import { test, expect } from "@playwright/test";

test("the tmux session column is bounded and scrollable", async ({ page }) => {
  // A flex child defaults to `min-height: auto` and refuses to shrink below its content, so
  // `flex-1` alone let this viewport grow to fit every session instead of being bounded by the
  // window. Measured: 2172px tall inside a 720px window — roughly 1450px of sessions below the
  // fold with no scrollbar and no way to reach them. `min-h-0` is what bounds it.
  //
  // Asserted on the measurement rather than the class name, so a refactor that keeps the class
  // but breaks the layout still fails.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });

  await page.goto("/?view=tmux_monitor&hostId=1", {
    waitUntil: "domcontentloaded",
  });
  const viewport = page.locator("[data-slot=scroll-area-viewport]").first();
  await viewport.waitFor({ timeout: 30_000 });

  const m = await viewport.evaluate((el) => ({
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
    overflowY: getComputedStyle(el).overflowY,
    windowHeight: window.innerHeight,
  }));
  console.log("SCROLL PROBE:", JSON.stringify(m));

  // The property that was broken: the viewport must be BOUNDED by the window rather than
  // growing to fit its content. Without `min-h-0` it stretched past the bottom of the page.
  expect(m.clientHeight).toBeGreaterThan(0);
  expect(m.clientHeight).toBeLessThanOrEqual(m.windowHeight);
  expect(["auto", "scroll", "hidden"]).toContain(m.overflowY);
});
