import { expect, test } from "@playwright/test";
import { openStudio, publish, soonLocalValue, watchFailures } from "./support";

test("self check-in and staff check-in each record once", async ({ page }) => {
  const problems = watchFailures(page);
  const { slug } = await openStudio(page);
  await publish(page, "Mat basics", "6", soonLocalValue(25));

  await page.goto(`/s/${slug}`);
  await page.getByRole("link", { name: "Reserve" }).click();
  await page.getByLabel("Name").fill("Avery Lane");
  await page.getByLabel("Email").fill("avery@example.test");
  await page.getByRole("button", { name: "Reserve spot" }).click();
  await page.getByRole("button", { name: "I’m here" }).click();
  await expect(page.getByText("Checked in · self")).toBeVisible();
  await page.getByRole("button", { name: "I’m here" }).click({ timeout: 1000 }).catch(() => undefined);
  await expect(page.getByText("Checked in · self")).toHaveCount(1);

  await page.goto(`/s/${slug}`);
  await page.getByRole("link", { name: "Reserve" }).click();
  await page.getByLabel("Name").fill("Blair Chen");
  await page.getByLabel("Email").fill("blair@example.test");
  await page.getByRole("button", { name: "Reserve spot" }).click();
  await page.goto("/studio/check-in");
  await page.getByRole("button", { name: "Check in Blair Chen" }).click();
  await expect(page.getByText("Checked in · staff")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check in Blair Chen" })).toHaveCount(0);
  await expect(page.getByText("Checked in · self")).toBeVisible();
  expect(problems).toEqual([]);
});
