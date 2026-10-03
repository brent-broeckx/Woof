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

test('collects treats from the yard jar', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.yard.settledAt -= 6 * 3_600_000;
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Yard/ }).click();
  await expect(page.getByRole('heading', { name: 'Treat jar' })).toBeVisible();
  await page.getByRole('button', { name: /^Collect \d+/ }).click();
  await expect(page.getByRole('button', { name: /^Collect/ })).toBeDisabled();
});

test('adopts a pup at the adoption fair', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.treats = 250;
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Yard/ }).click();
  await page.getByRole('button', { name: /Adoption Fair/ }).click();
  await page.getByRole('button', { name: /^Adopt a pup/ }).click();
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.chip').first()).toHaveText('🍖 150');
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /Pack/ }).click();
  await expect(page.getByText(/^[12] \/ 24 breeds collected/)).toBeVisible();
});

test('sends a dog on an expedition and opens the loot', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.chests = { 1: true };
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Yard/ }).click();
  await page.getByRole('button', { name: /Trips/ }).click();
  await page.getByRole('button', { name: /Pug/ }).click();
  await page.getByRole('button', { name: /^Send 1 to Backyard/ }).click();
  await expect(page.getByText(/^Back in/)).toBeVisible();
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{}');
    for (const t of raw.state.expeditions.trips) t.endsAt = Date.now() - 1000;
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await expect(page.getByText('🧭 Trip back!')).toBeVisible();
  await page.getByRole('button', { name: /Yard/ }).click();
  await page.getByRole('button', { name: /Trips/ }).click();
  await page.getByRole('button', { name: /Open loot/ }).click();
  await expect(page.getByRole('heading', { name: 'Back from Backyard!' })).toBeVisible();
  await page.getByRole('button', { name: 'Nice!' }).click();
  await expect(page.locator('.chip').first()).not.toHaveText('🍖 0');
});

test('arcade unlocks games from cleared bonus parks', async ({ page }) => {
  await page.getByRole('button', { name: /Arcade/ }).click();
  await expect(page.getByText(/Clear your first Bonus Park/)).toBeVisible();
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.progress = { 1: { stars: 3 }, 2: { stars: 3 }, 3: { stars: 3 }, 4: { stars: 3 }, 5: { stars: 2 } };
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Arcade/ }).click();
  await expect(page.getByRole('button', { name: /· Good Boy \(locked\)/ })).toBeDisabled();
  await page.getByRole('button', { name: /· Pup$/ }).click();
  await expect(page.getByText(/No medal yet/)).toBeVisible();
  await page.getByRole('button', { name: 'Play!' }).click();
  await page.getByRole('button', { name: 'Quit run' }).click();
  await page.getByRole('button', { name: 'Back to Arcade' }).click();
  await expect(page.getByText(/Today's kibble/)).toBeVisible();
});

test('claims a badge tier for rewards', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.stats = { ...raw.state.stats, totals: { ...raw.state.stats.totals, puzzlesSolved: 12 } };
    raw.state.treats = 0;
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Badges/ }).click();
  const card = page.getByLabel('Puzzle Pro badge');
  await expect(card.getByText('12/100')).toBeVisible();
  await card.getByRole('button', { name: 'Claim' }).click();
  await expect(page.getByRole('heading', { name: '🏅 Puzzle Pro' })).toBeVisible();
  await page.getByRole('button', { name: 'Woof!' }).click();
  await expect(card.getByRole('button', { name: 'Claim' })).toHaveCount(0);
  await expect(page.locator('.chip').first()).toHaveText(/^1\/\d+$/);
});

test('weekly boss unlocks after world 1', async ({ page }) => {
  await page.getByRole('button', { name: /Boss/ }).click();
  await expect(page.getByText(/Finish World 1/)).toBeVisible();
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.progress = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [i + 1, { stars: 3 }]));
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Boss/ }).click();
  await page.getByRole('button', { name: 'Start the climb' }).click({ timeout: 15000 });
  await expect(page.locator('.level-title')).toHaveText('Weekly Boss');
  await expect(page.locator('.cell')).toHaveCount(100);
});

test('cat café opens after level 10 with sleeping cats on the board', async ({ page }) => {
  await page.getByRole('button', { name: /Cat Café/ }).click();
  await expect(page.getByText(/Reach level 11/)).toBeVisible();
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.progress = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, { stars: 3 }]));
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Cat Café/ }).click();
  await expect(page.locator('.cafe-tile')).toHaveCount(30);
  await expect(page.getByRole('button', { name: 'Café level 2, locked' })).toBeDisabled();
  await page.getByRole('button', { name: 'Café level 1', exact: true }).click();
  await expect(page.locator('.level-title')).toHaveText('Cat Café 1', { timeout: 15000 });
  await expect(page.locator('.cell')).toHaveCount(36);
  await expect(page.locator('.mark.cat').first()).toBeVisible();
});

test('the map shows the Snowy Woods world', async ({ page }) => {
  await page.getByRole('button', { name: /Level map/ }).click();
  await expect(page.getByText(/Snowy Woods/)).toBeVisible();
});

test('decorates the yard and takes a photo', async ({ page }) => {
  await page.getByRole('button', { name: /Yard/ }).click();
  await page.getByRole('button', { name: '🎨 Decorate' }).click();
  await page.locator('.decor-choice', { hasText: 'Daisies' }).click();
  await page.getByRole('button', { name: 'Yard spot 2, empty' }).click();
  await expect(page.getByRole('button', { name: 'Yard spot 2: Daisies' })).toBeVisible();
  await page.getByRole('button', { name: '✓ Done' }).click();
  await expect(page.locator('.yard-deco')).toHaveCount(4);
  await page.getByRole('button', { name: '📸 Photo' }).click();
  await expect(page.locator('img.yard-photo')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save image' }).click();
  expect((await download).suggestedFilename()).toMatch(/-yard\.png$/);
});

test('buys yard decor in the kennel', async ({ page }) => {
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('woofdoku-save') ?? '{"state":{},"version":1}');
    raw.state.treats = 100;
    localStorage.setItem('woofdoku-save', JSON.stringify(raw));
  });
  await page.reload();
  await page.getByRole('button', { name: /Kennel/ }).click();
  await page.getByRole('tab', { name: /Decor/ }).click();
  await page.getByRole('button', { name: '🍖 40' }).first().click();
  await expect(page.locator('.chip').first()).toHaveText('🍖 60');
  await expect(page.getByText('Owned')).toHaveCount(4);
});
