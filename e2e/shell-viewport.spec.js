import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tf1200', width: 1024, height: 768 },
];

async function expectNoHorizontalOverflow(page) {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.bodyScrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.bodyClientWidth,
  );
}

for (const viewport of viewports) {
  test(`shell and design controls do not overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Machine Off' })).toBeVisible();
    await expect(page.getByText('SvelteHMI')).toBeVisible();
    await expect(page.getByText('Machine States')).toBeVisible();
    await expect(page.getByText('Safety', { exact: true })).toBeVisible();
    await expect(page.getByText('Tray Position', { exact: true })).toBeVisible();
    await expect(page.getByText('Performance', { exact: true })).toBeVisible();
    await expect(page.getByText('Tray target')).toBeVisible();
    await expect(page.getByText('Tray actual')).toBeVisible();
    await expect(page.getByLabel('Main page state and event status')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Recipe' }).click();
    await expect(page.getByText('Working Recipe')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('PLC Command Path Ready');
    await expect(page.getByLabel('Recipe parameter editor')).toBeVisible();
    await expect(page.getByLabel('Gluing recipe parameters')).toBeVisible();
    await expect(page.getByText('Leading Pattern ms')).toBeVisible();
    await expect(page.getByText('Trailing Pattern ms')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply Pattern' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'LH3' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RH3' })).toBeVisible();
    await expect(page.getByText('Start Position')).toHaveCount(0);
    await expect(page.getByText('Counts')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Forming' }).click();
    await expect(page.getByLabel('Forming recipe parameters')).toBeVisible();
    await expect(page.getByText('Rotary ms')).toBeVisible();
    await expect(page.getByText('Side Align ms')).toBeVisible();
    await expect(page.getByText('Back Stop ms')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.locator('.recipe-redesign-header .param-box').first().click();
    await expect(page.getByRole('dialog')).toContainText('Select - Recipe');
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Diagnostics' }).click();
    await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
    await expect(page.getByLabel('Coil diagnostics')).toBeVisible();
    await expect(page.getByLabel('Service Enable')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Events' }).click();
    await expect(page.getByRole('heading', { name: 'Event Surface' })).toBeVisible();
    await expect(page.getByLabel('PLC alarm contract status')).toBeVisible();
    await expect(page.getByLabel('Current event conditions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Acknowledge' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
}

test('nav target switches the page outlet', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Machine Off' })).toBeVisible();

  await page.getByRole('button', { name: 'Events' }).click();

  await expect(page.getByRole('heading', { name: 'Event Surface' })).toBeVisible();
  await expect(page.getByText('PLC Alarm Contract')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Machine Off' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
