import { test, expect } from '@playwright/test';

test.describe('Selector de oferta (ERP vs Diseño)', () => {
  test('Por defecto muestra ERP', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Software que factura')).toBeVisible();
    await expect(page.locator('text=Facturación electrónica')).toBeVisible();
  });

  test('Cambia a diseño con ?oferta=diseno', async ({ page }) => {
    await page.goto('/?oferta=diseno');
    await expect(page.locator('text=Diseño que convierte')).toBeVisible();
    await expect(page.locator('text=Sitios, identidad y landings')).toBeVisible();
  });

  test('Cambia a ERP con ?oferta=erp', async ({ page }) => {
    await page.goto('/?oferta=erp');
    await expect(page.locator('text=Software que factura')).toBeVisible();
  });
});