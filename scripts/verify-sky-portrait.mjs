import { chromium } from '@playwright/test';

const browser = await chromium.launch();

// Portrait: camera clamps at far-1 (499) — previously exited the 200-radius dome
const portrait = await browser.newPage({ viewport: { width: 450, height: 900 } });
await portrait.goto('http://localhost:5199/', { waitUntil: 'load' });
await portrait.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await portrait.waitForTimeout(1500);
await portrait.screenshot({ path: 'images/verify/47-sky-portrait-overview.png' });
await portrait.close();

// Low ground-level view: drag tilt to max polar angle (85deg) in local focus
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1500);
const label = page.locator('.entity-label[data-label-id="soft-robotics-lab"]');
if (await label.isVisible()) {
  await label.click();
} else {
  await page.locator('#organization-explorer button').filter({ hasText: /Soft Robotic/ }).first().click();
}
await page.waitForTimeout(1400);
const canvas = page.locator('canvas').first();
await canvas.hover();
for (let i = 0; i < 6; i++) {
  await page.mouse.down();
  await page.mouse.move(800, 450);
  await page.mouse.move(800, 700, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: 'images/verify/48-sky-ground-level.png' });

await browser.close();
console.log('DONE');
