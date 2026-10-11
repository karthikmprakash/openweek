import { randomBytes } from "crypto";
import { expect, type Page } from "@playwright/test";

export function futureLocalValue() {
  const day = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T09:00`;
}

export async function openStudio(page: Page) {
  const stamp = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const password = `local-${randomBytes(9).toString("hex")}`;
  const slug = `room${stamp}`;
  await page.goto("/signup");
  await page.getByLabel("Studio name").fill(`Room ${stamp}`);
  await page.getByLabel("Web address").fill(slug);
  await page.getByLabel("Your name").fill("Casey Owner");
  await page.getByLabel("Email").fill(`owner-${stamp}@example.test`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create studio" }).click();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await page.locator('a[href="/studio/schedule?new=1"]').click();
  await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
  return { slug, password };
}

export async function publish(page: Page, name: string, spots = "4") {
  await page.getByLabel("Class name").fill(name);
  await page.getByLabel("Minutes").fill("50");
  await page.getByLabel("Spots").fill(spots);
  await page.getByLabel("Drop-in price").fill("0");
  await page.getByLabel("First session").fill(futureLocalValue());
  await page.getByRole("button", { name: "Publish class" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

export function watchFailures(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) problems.push(`${response.status()} ${response.url()}`);
  });
  return problems;
}
