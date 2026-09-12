import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const live = process.env.TOOHAK_LIVE_E2E === '1'
const hostEmail = process.env.TOOHAK_E2E_HOST_EMAIL
const hostPassword = process.env.TOOHAK_E2E_HOST_PASSWORD

test.describe('live Supabase vertical slice', () => {
  test.skip(!live || !hostEmail || !hostPassword, 'Set live E2E variables; this suite never substitutes a fake backend.')

  test('host creates and publishes, three independent players join, answer, refresh, score, and report', async ({ browser, page }) => {
    test.setTimeout(180_000)
    await page.goto('#/auth')
    await page.getByLabel('Email address').fill(hostEmail!)
    await page.getByLabel('Password').fill(hostPassword!)
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page).toHaveURL(/dashboard/)

    const title = `Live acceptance ${Date.now()}`
    await page.getByRole('link', { name: /Create quiz/ }).first().click()
    await page.getByLabel('Quiz title').fill(title)
    await page.getByLabel('Question prompt').fill('Which answer is correct?')
    await page.getByPlaceholder('Answer 1').fill('This one')
    await page.getByPlaceholder('Answer 2').fill('Not this one')
    await page.getByRole('button', { name: 'Publish' }).click()
    await expect(page.getByText('Saved')).toBeVisible()
    await page.getByLabel('Back to dashboard').click()
    const card = page.locator('.quiz-card').filter({ hasText: title })
    await card.getByRole('button', { name: 'Host' }).click()
    const pinText = (await page.locator('.pin-board h1').innerText()).replace(/\D/g, '')
    expect(pinText).toHaveLength(6)
    const joinUrl = new URL(page.url())
    joinUrl.hash = `#/?pin=${pinText}`

    const contexts: BrowserContext[] = []
    const players: Page[] = []
    for (const name of ['Ruby', 'Scarlet', 'Crimson']) {
      const context = await browser.newContext(); contexts.push(context)
      const player = await context.newPage(); players.push(player)
      await player.goto(joinUrl.href)
      await player.getByLabel('Nickname').fill(`${name}-${Date.now().toString().slice(-4)}`)
      await player.getByRole('button', { name: 'Continue' }).click()
      await expect(player.getByText('YOU’RE IN!')).toBeVisible()
    }
    await expect(page.getByText('3 players joined')).toBeVisible()
    await players[0].reload()
    await expect(players[0].getByText('YOU’RE IN!')).toBeVisible()
    await page.getByRole('button', { name: 'Start game' }).click()
    for (const player of players) {
      await expect(player.getByText('Which answer is correct?')).toBeVisible({ timeout: 15_000 })
      await player.getByRole('radio', { name: /This one/ }).click()
      await player.getByRole('button', { name: 'Submit answer' }).click()
      await expect(player.getByText('Answer locked in!')).toBeVisible()
    }
    await expect(page.getByText('3 / 3 answered')).toBeVisible()
    await page.getByRole('button', { name: /Close answers/ }).click()
    for (const player of players) await expect(player.getByText('Correct!')).toBeVisible()
    await page.getByRole('button', { name: /Show leaderboard/ }).click()
    await page.getByRole('button', { name: 'Final podium' }).click()
    await expect(page.getByText('What a finish!')).toBeVisible()
    await page.getByRole('link', { name: 'View full report' }).click()
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible()
    for (const context of contexts) await context.close()
  })
})
