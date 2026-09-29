import { test, expect } from '@playwright/test';

test.describe('Formulario de contacto', () => {
  test('Envía formulario correctamente', async ({ page }) => {
    await page.goto('/contacto');
    await page.fill('input[name="name"]', 'Juan Pérez');
    await page.fill('input[name="email"]', 'juan@example.com');
    await page.fill('textarea[name="message"]', 'Hola, quiero información.');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Mensaje enviado')).toBeVisible();
  });

  test('Muestra error si falta email', async ({ page }) => {
    await page.goto('/contacto');
    await page.fill('input[name="name"]', 'Juan Pérez');
    await page.fill('textarea[name="message"]', 'Hola');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email inválido')).toBeVisible();
  });
});