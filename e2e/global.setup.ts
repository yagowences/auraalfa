import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("autenticar", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("voce@exemplo.com").fill(process.env.TEST_USER_EMAIL!);
  await page.getByPlaceholder("Senha").fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("link", { name: "Ano / Metas" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
