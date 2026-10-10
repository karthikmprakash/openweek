import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStudio, publish, watchFailures } from "./support";

test("guest books a published class and capacity drops", async ({ page }) => {
  const problems = watchFailures(page);
  const { slug } = await openStudio(page);
  await publish(page, "Dawn reformer", "4");
  await page.goto(`/s/${slug}`);
  await expect(page.getByText("4 spots left")).toBeVisible();
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await page.getByRole("link", { name: "Reserve" }).click();
  await page.getByLabel("Name").fill("Avery Lane");
  await page.getByLabel("Email").fill("avery@example.test");
  await page.getByRole("button", { name: "Reserve spot" }).click();
  await expect(page.getByRole("heading", { name: "You’re in" })).toBeVisible();
  await page.goto(`/s/${slug}`);
  await expect(page.getByText("3 spots left")).toBeVisible();
  expect(problems).toEqual([]);
});
