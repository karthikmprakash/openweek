import { expect, test } from "@playwright/test";
import { openStudio, publish, watchFailures } from "./support";

test("member schedule is installable, offline, and usable at 375px", async ({ page }) => {
  const problems = watchFailures(page);
  const { slug } = await openStudio(page);
  await publish(page, "Evening barre", "5");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/s/${slug}`);
  await expect(page.getByRole("heading", { name: "Evening barre" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "replica/clone-screens/S07-mobile.png", fullPage: true });

  const installable = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { ok: false, reason: "missing manifest link" };
    const response = await fetch((link as HTMLLinkElement).href);
    const manifest = await response.json();
    const sizes = (manifest.icons ?? []).map((icon: { sizes?: string }) => icon.sizes);
    return {
      ok:
        manifest.name === "StudioFlat" &&
        manifest.short_name === "StudioFlat" &&
        manifest.display === "standalone" &&
        typeof manifest.start_url === "string" &&
        sizes.includes("192x192") &&
        sizes.includes("512x512"),
      manifest,
    };
  });
  expect(installable.ok).toBe(true);

  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    return Boolean(registration?.active);
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Evening barre" })).toBeVisible();
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Evening barre" })).toBeVisible();
  expect(problems).toEqual([]);
});
