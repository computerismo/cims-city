import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1500);

const district = page.locator('.entity-label[data-label-id="elastocalorics"]');
if (await district.isVisible()) {
  await district.click();
} else {
  await page.locator('#organization-explorer button').filter({ hasText: /Elastocalorics/ }).first().click();
}
await page.waitForTimeout(1400);

// Zoom in on the framed district; no drag (drag-after-zoom stalled headless GPU).
await page.mouse.move(800, 450);
for (let i = 0; i < 6; i++) {
  await page.mouse.wheel(0, -220);
  await page.waitForTimeout(120);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: 'images/verify/52-side-windows-closeup.png' });

await browser.close();
console.log('DONE');
