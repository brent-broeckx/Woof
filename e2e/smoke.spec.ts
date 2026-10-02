import { expect, test, type Page } from '@playwright/test';

/** Place every dog of the current level-puzzle using the shipped solution. */
async function solveBoard(page: Page, puzzleIndex: number) {
  const cells = await page.evaluate(async (i) => {
    const { PUZZLES } = await import('/src/data/puzzles.ts');
    const p = PUZZLES[i];
    return p.solution.map((col: number, row: number) => row * p.size + col);
  }, puzzleIndex);
  for (const cell of cells) {
    await page.locator(`[data-cell="${cell}"]`).click({ button: 'right' });
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /^🐾 Adopt/ }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('solves level 1 from the title screen', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /woofdoku/i })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: "Let's go!" }).click();
  await solveBoard(page, 0);
  await expect(page.getByRole('heading', { name: 'Level 1 complete!' })).toBeVisible();
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.locator('.level-title')).toHaveText('Level 2');
});

test('shows the first bonus game after four levels', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.progress = { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 }, 4: { stars: 3 } };
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Continue · Level 5/ }).click();
  await expect(page.getByText('Connect the Leashes').first()).toBeVisible();
});

test('generates the daily puzzle in a worker', async ({ page }) => {
  await page.getByRole('button', { name: /Daily/ }).click();
  const start = page.getByRole('button', { name: 'Start walk' });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await expect(page.locator('[data-cell]').first()).toBeVisible();
  await expect(page.locator('.level-title')).toHaveText('Daily Walk');
});

test('buys and equips a board theme', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.treats = 500;
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Kennel/ }).click();
  await page.getByRole('tab', { name: /Boards/ }).click();
  await page.getByRole('button', { name: '🍖 150' }).click();
  await expect(page.getByText('Equipped')).toHaveCount(1);
  await expect(page.locator('.chip').first()).toHaveText('🍖 350');
});
