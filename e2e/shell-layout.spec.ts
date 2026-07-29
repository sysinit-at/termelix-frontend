import { test, expect, type Page } from "@playwright/test";

/**
 * The shell's interaction rules, as a user meets them:
 *
 *   - the sessions column is always there, not a view you open
 *   - a click on a host scopes that column to it; "Show all" widens it again
 *   - nothing expands because the pointer passed over it
 *   - host actions live on right-click
 *
 * Driven through the real UI rather than asserted on classes, so a refactor that keeps the
 * markup but breaks the behaviour still fails.
 */

async function login(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#login-user").waitFor({ timeout: 30_000 });
  await page.locator("#login-user").fill("e2e");
  await page.locator("#login-pass").fill("e2e-password-123");
  await page.locator('button[type="submit"]').click();
  await page.getByText("e2e-local").first().waitFor({ timeout: 30_000 });
}

test("the sessions column is present without opening anything", async ({
  page,
}) => {
  await login(page);

  // Present on arrival — no tab opened, no menu used.
  const column = page.getByRole("button", { name: /refresh/i }).first();
  await expect(column).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^Sessions$/).first()).toBeVisible();
});

test("clicking a host scopes the column, and Show all widens it again", async ({
  page,
}) => {
  await login(page);

  const host = page.getByText("e2e-local").first();
  await host.click();

  // Scoped: the column names the host it is showing, and offers the way back.
  const showAll = page.getByRole("button", { name: /show all/i });
  await expect(showAll).toBeVisible({ timeout: 20_000 });

  await showAll.click();
  await expect(showAll).toBeHidden();
  await expect(page.getByText(/all hosts/i).first()).toBeVisible();
});

test("a host row does not grow when the pointer crosses it", async ({
  page,
}) => {
  await login(page);

  const name = page.getByText("e2e-local").first();
  // The ROW, not the name. Measuring the name span was the first version of this test, and it
  // passed against the old tray UI as well — the span never changed height, only the row around
  // it did. `data-slot="context-menu-trigger"` is the row itself and exists in both versions of
  // the markup (the old one wrapped the same div in a dropdown trigger).
  const row = name.locator(
    'xpath=ancestor::div[@data-slot="context-menu-trigger" or contains(@class,"group")][1]',
  );

  const before = await row.boundingBox();
  await row.hover();
  // A tray used to slide open here, pushing everything below it down. Allow more time than the
  // 150ms transition needed, then measure again.
  await page.waitForTimeout(500);
  const after = await row.boundingBox();

  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after?.height).toBeCloseTo(before?.height ?? 0, 0);
});

test("host actions are reachable without knowing about right-click", async ({
  page,
}) => {
  await login(page);

  // The visible affordance. Right-click works too, but a gesture nothing advertises is not a
  // way to find anything — which is exactly how this was reported.
  const row = page.getByText("e2e-local").first();
  await row.hover();
  await page.getByRole("button", { name: /actions for e2e-local/i }).click();

  const menu = page.locator('[data-slot="dropdown-menu-content"]');
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await expect(menu.getByText(/open terminal/i)).toBeVisible();
  await expect(menu.getByText(/open tmux monitor/i)).toBeVisible();
  await expect(menu.getByText(/edit host/i)).toBeVisible();
  // This fixture has the file manager and tunnels switched off, and the menu says so by not
  // offering them. Asserting the absence is what proves the list follows the host rather than
  // listing everything the app can do.
  await expect(menu.getByText(/open file browser/i)).toHaveCount(0);
  await expect(menu.getByText(/open tunnels/i)).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("the actions button does not select or open the host", async ({
  page,
}) => {
  await login(page);

  await page.getByText("e2e-local").first().hover();
  await page.getByRole("button", { name: /actions for e2e-local/i }).click();
  await expect(
    page.locator('[data-slot="dropdown-menu-content"]'),
  ).toBeVisible();

  // Clicking the button must not also scope the sessions column or open a tab: the row's own
  // handlers sit underneath it.
  await expect(page.getByRole("button", { name: /show all/i })).toBeHidden();
  await expect(page.locator(".xterm")).toHaveCount(0);
});

test("host actions are on the context menu", async ({ page }) => {
  await login(page);

  await page.getByText("e2e-local").first().click({ button: "right" });

  const menu = page.locator('[data-slot="context-menu-content"]');
  await expect(menu).toBeVisible({ timeout: 10_000 });
  await expect(menu.getByText(/open terminal/i)).toBeVisible();
  await expect(menu.getByText(/edit host/i)).toBeVisible();

  // Escape closes it without doing anything.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});
