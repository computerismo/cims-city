import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1500);

const label = page.locator('.entity-label[data-label-id="cims-hub"]');
if (await label.isVisible()) {
  await label.click();
} else {
  await page.locator('#organization-explorer button').filter({ hasText: /CiMS/ }).first().click();
}
await page.waitForTimeout(1400);
await page.screenshot({ path: 'images/verify/42-focus-hub.png' });

await browser.close();
console.log('DONE');
