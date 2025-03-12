import { test, expect } from "@playwright/test";

test("Проверка главной страницы", async ({ page }) => {
  // Переходим на нужный URL
  await page.goto("http://localhost:3000");

  // Ждем, пока страница полностью загрузится
  await page.waitForLoadState("networkidle");

  // Проверяем заголовок вкладки
  await expect(page).toHaveTitle(/VPN/);
});
