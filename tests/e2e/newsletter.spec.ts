import { test, expect } from '@playwright/test';

test.describe('Newsletter en footer', () => {
  test('Suscripción exitosa', async ({ page }) => {
    await page.goto('/');
    const email = `news_${Date.now()}@example.com`;
    await page.fill('footer input[type="email"]', email);
    await page.click('footer button[type="submit"]');
    await expect(page.locator('text=¡Gracias por suscribirte!')).toBeVisible();
  });

  test('Email duplicado muestra mensaje', async ({ page }) => {
    await page.goto('/');
    const email = `dup_${Date.now()}@example.com`;
    // Primera suscripción
    await page.fill('footer input[type="email"]', email);
    await page.click('footer button[type="submit"]');
    await expect(page.locator('text=¡Gracias por suscribirte!')).toBeVisible();
    // Segunda suscripción
    await page.fill('footer input[type="email"]', email);
    await page.click('footer button[type="submit"]');
    await expect(page.locator('text=Este email ya está suscrito')).toBeVisible();
  });
});