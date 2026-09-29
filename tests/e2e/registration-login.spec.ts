import { test, expect } from '@playwright/test';

test.describe('Registro y Login', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  const password = 'Password123!';

  test('Usuario puede registrarse', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    // Redirige a dashboard o página de confirmación
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Usuario puede iniciar sesión', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Login falla con contraseña incorrecta', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Credenciales inválidas')).toBeVisible();
  });
});