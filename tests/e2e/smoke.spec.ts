import { expect, test } from '@playwright/test'

test('home, language switch, join validation, and auth navigation render', async ({ page }) => {
  await page.goto('#/')
  await expect(page.getByRole('heading', { name: /Turn every question/ })).toBeVisible()
  await page.getByLabel('Game PIN').fill('123')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('alert')).toContainText('6-digit')
  await page.getByRole('button', { name: 'ภาษาไทย' }).click()
  await expect(page.getByRole('heading', { name: 'เข้าร่วมเกม' })).toBeVisible()
  await page.getByRole('link', { name: 'ผู้ดำเนินเกม' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('home is usable at a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('#/')
  await expect(page.getByLabel('Toohak home')).toBeVisible()
  await expect(page.getByLabel('Game PIN')).toBeVisible()
  await expect(page.locator('.join-panel').evaluate((element) => element.getBoundingClientRect().width)).resolves.toBeLessThanOrEqual(390)
})
