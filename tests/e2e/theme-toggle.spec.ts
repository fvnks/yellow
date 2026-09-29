import { test, expect } from '@playwright/test';

test.describe('Toggle de tema', () => {
  test('Cambia a modo oscuro y persiste', async ({ page }) => {
    await page.goto('/');
    // Inicialmente modo claro
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    // Click toggle
    await page.click('button[aria-label="Cambiar a modo oscuro"]');
    await expect(page.locator('html')).toHaveClass(/dark/);
    // Recargar y persistir
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    // Volver a claro
    await page.click('button[aria-label="Cambiar a modo claro"]');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });
});