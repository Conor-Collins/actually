import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { ConfigurationPage } from './page-models/configuration-page';
import { Navigation } from './page-models/navigation';

// The sections of the page that are cut off: each one is shorter than what is
// in it. On a wide screen the sections are laid out one under the other in a
// block that scrolls, and none of them may be squeezed to make the block fit.
async function cutOffSections(page: Page): Promise<string[]> {
  const needsAttention = page.getByRole('region', { name: 'Needs attention' });
  return await needsAttention.evaluate(region =>
    Array.from(region.parentElement?.children ?? [])
      .filter(section => section.scrollHeight > section.clientHeight + 1)
      .map(section => (section.textContent ?? '').slice(0, 40)),
  );
}

async function bottomOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error('The element is not laid out');
  }
  return box.y + box.height;
}

async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (box === null) {
    throw new Error('The element is not laid out');
  }
  return box.y;
}

// The demo file has more categories than fit in the window, so the page is
// taller than the window.
async function expectSectionsUnderEachOther(page: Page) {
  const needsAttention = page.getByRole('region', { name: 'Needs attention' });
  const periods = page.getByRole('table', { name: 'Periods by category' });
  const accounts = page.getByRole('group', { name: 'Accounts', exact: true });
  await expect(periods).toBeVisible();
  await expect(accounts).toBeAttached();

  expect(await cutOffSections(page)).toEqual([]);
  expect(await topOf(periods)).toBeGreaterThanOrEqual(
    (await bottomOf(needsAttention)) - 1,
  );
  expect(await topOf(accounts)).toBeGreaterThanOrEqual(
    (await bottomOf(periods)) - 1,
  );

  // The accounts are below the window, and the page scrolls to them
  await expect(accounts).not.toBeInViewport();
  await accounts.scrollIntoViewIfNeeded();
  await expect(accounts).toBeInViewport();
}

test.describe('Period Budget', () => {
  let page: Page;
  let navigation: Navigation;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    navigation = new Navigation(page);

    await page.goto('/');
    await new ConfigurationPage(page).createTestFile();
    await navigation.goToSettingsPage();
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test('lays the sections out under each other in the settings', async () => {
    await page
      .getByRole('navigation', { name: 'Settings' })
      .getByRole('link', { name: 'Period Budget' })
      .click();

    await expectSectionsUnderEachOther(page);
  });

  test('lays the sections out under each other when opened from the sidebar', async () => {
    await page
      .locator('label[for="toggle-sidebar-item-period-budget"]')
      .click();
    await page
      .getByTestId('sidebar-primary-buttons')
      .getByRole('link', { name: 'Period Budget' })
      .click();
    await expect(page).toHaveURL(/\/period-budget$/);

    await expectSectionsUnderEachOther(page);
  });

  test('starts repeating periods for a category from its form', async () => {
    await page
      .getByRole('navigation', { name: 'Settings' })
      .getByRole('link', { name: 'Period Budget' })
      .click();
    const periods = page.getByRole('table', { name: 'Periods by category' });

    // Power is the last category of the demo file: its form opens at the
    // bottom of the table, where the sections used to lie over each other
    await periods.getByRole('button', { name: 'Power', exact: true }).click();
    const form = periods
      .getByRole('region', { name: 'Power', exact: true })
      .getByRole('group', { name: 'Repeating periods' });
    await form
      .getByRole('textbox', { name: 'First day of the first period' })
      .fill('2017-01-01');
    await form.getByRole('spinbutton', { name: 'Length in months' }).fill('1');
    await form
      .getByRole('textbox', { name: 'Allowance of each period' })
      .fill('120');
    await form.getByRole('button', { name: 'Start repeating' }).click();

    await expect(
      periods.getByRole('button', {
        name: 'Power, January 2017, spent 0.00 of 120.00, remaining 120.00, active',
      }),
    ).toBeVisible();
    await expect(
      form.getByRole('button', { name: 'Stop repeating' }),
    ).toBeVisible();
  });
});
