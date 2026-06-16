import { expect, test } from '@playwright/test';

const retrofitViewport = { name: 'retrofit 800x480', width: 800, height: 480 };

async function expectNoViewportOverflow(page) {
  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bodyClientWidth: document.body.clientWidth,
    bodyClientHeight: document.body.clientHeight,
    bodyScrollWidth: document.body.scrollWidth,
    bodyScrollHeight: document.body.scrollHeight,
    shellClientWidth: document.querySelector('.app-shell')?.clientWidth ?? 0,
    shellClientHeight: document.querySelector('.app-shell')?.clientHeight ?? 0,
    shellScrollWidth: document.querySelector('.app-shell')?.scrollWidth ?? 0,
    shellScrollHeight: document.querySelector('.app-shell')?.scrollHeight ?? 0,
  }));

  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.clientWidth);
  expect(layout.scrollHeight, JSON.stringify(layout)).toBeLessThanOrEqual(layout.clientHeight);
  expect(layout.bodyScrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.bodyClientWidth,
  );
  expect(layout.bodyScrollHeight, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.bodyClientHeight,
  );
  expect(layout.shellScrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.shellClientWidth,
  );
  expect(layout.shellScrollHeight, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.shellClientHeight,
  );

  const nestedScrollers = await page.evaluate(() => {
    const scrollableValues = new Set(['auto', 'scroll', 'overlay']);

    function selectorFor(element) {
      if (element.id) return `#${element.id}`;
      const className = [...element.classList].slice(0, 3).join('.');
      const name = element.getAttribute('aria-label') || element.getAttribute('role') || '';
      return `${element.tagName.toLowerCase()}${className ? `.${className}` : ''}${
        name ? `[${name}]` : ''
      }`;
    }

    return [...document.querySelectorAll('*')]
      .map((element) => {
        const style = window.getComputedStyle(element);
        const hasHorizontalScroller =
          scrollableValues.has(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
        const hasVerticalScroller =
          scrollableValues.has(style.overflowY) && element.scrollHeight > element.clientHeight + 1;

        if (!hasHorizontalScroller && !hasVerticalScroller) return null;

        return {
          selector: selectorFor(element),
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight,
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
        };
      })
      .filter(Boolean);
  });

  expect(nestedScrollers, JSON.stringify(nestedScrollers, null, 2)).toEqual([]);
}

test(`reference shell and main page fit ${retrofitViewport.name}`, async ({ page }) => {
  await page.setViewportSize({ width: retrofitViewport.width, height: retrofitViewport.height });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Machine Off' })).toBeVisible();
  await expect(page.getByText('KITA')).toBeVisible();
  await expect(page.getByText('PACKAGING MACHINERY')).toBeVisible();
  await expect(page.getByLabel('PLC Connected')).toBeVisible();
  await expect(page.getByText('Machine States')).toBeVisible();
  await expect(page.getByText('Safety', { exact: true })).toBeVisible();
  await expect(page.getByText('Tray Position', { exact: true })).toBeVisible();
  await expect(page.getByText('Performance', { exact: true })).toBeVisible();
  await expect(page.getByText('Tray target')).toBeVisible();
  await expect(page.getByText('Tray actual')).toBeVisible();
  await expect(page.getByLabel('Panel status pills')).toBeVisible();
  await expectNoViewportOverflow(page);

  await page.getByRole('button', { name: 'Recipes' }).click();
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
  await expectNoViewportOverflow(page);

  await page.getByRole('button', { name: 'Forming' }).click();
  await expect(page.getByLabel('Forming recipe parameters')).toBeVisible();
  await expect(page.getByText('Rotary ms')).toBeVisible();
  await expect(page.getByText('Side Align ms')).toBeVisible();
  await expect(page.getByText('Back Stop ms')).toBeVisible();
  await expectNoViewportOverflow(page);

  await page.locator('.recipe-redesign-header .param-box').first().click();
  await expect(page.getByRole('dialog')).toContainText('Select - Recipe');
  await expect(page.getByRole('button', { name: 'Accept' })).toBeVisible();
  await expectNoViewportOverflow(page);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Diagnostics' }).click();
  await expect(page.getByRole('heading', { name: 'Diagnostics' })).toBeVisible();
  await expect(page.getByLabel('Coil diagnostics')).toBeVisible();
  await expect(page.getByLabel('Service Enable')).toBeVisible();
  await expectNoViewportOverflow(page);

  await page.getByRole('button', { name: 'Events' }).click();
  await expect(page.getByRole('heading', { name: 'Event Surface' })).toBeVisible();
  await expect(page.getByLabel('PLC alarm contract status')).toBeVisible();
  await expect(page.getByLabel('Current event conditions')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Acknowledge' })).toHaveCount(0);
  await expectNoViewportOverflow(page);
});

test('nav target switches the page outlet', async ({ page }) => {
  await page.setViewportSize({ width: retrofitViewport.width, height: retrofitViewport.height });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Machine Off' })).toBeVisible();

  await page.getByRole('button', { name: 'Events' }).click();

  await expect(page.getByRole('heading', { name: 'Event Surface' })).toBeVisible();
  await expect(page.getByText('PLC Alarm Contract')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Machine Off' })).toHaveCount(0);
  await expectNoViewportOverflow(page);
});
