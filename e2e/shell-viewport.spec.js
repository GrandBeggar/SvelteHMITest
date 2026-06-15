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

    await expect(page.getByRole('heading', { name: 'Run Screen' })).toBeVisible();
    await expect(page.getByText('SvelteHMI')).toBeVisible();
    await expect(page.getByText('Machine States')).toBeVisible();
    await expect(page.getByText('Safety', { exact: true })).toBeVisible();
    await expect(page.getByText('Material', { exact: true })).toBeVisible();
    await expect(page.getByText('Performance', { exact: true })).toBeVisible();
    await expect(page.locator('.run-banner-state').getByText('Machine Ready')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Recipe' }).click();
    await expect(page.getByRole('heading', { name: 'Recipe Controls' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('PLC Command Path Ready');
    await expect(page.locator('.param-box')).toHaveCount(2);
    await expectNoHorizontalOverflow(page);

    await page.locator('.param-box').first().click();
    await expect(page.getByRole('dialog')).toContainText('Recipe - Selected');
    await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test('nav target switches the page outlet', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Run Screen' })).toBeVisible();

  await page.getByRole('button', { name: 'Diagnostics' }).click();

  await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Run Screen' })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
