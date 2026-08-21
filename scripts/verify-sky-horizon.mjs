import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1500);

// Overview pose
await page.screenshot({ path: 'images/verify/44-sky-overview.png' });

// Zoom out in steps toward maxDistance, watching the map edge vs sky
const canvas = page.locator('canvas').first();
for (let i = 0; i < 8; i++) {
  await canvas.hover();
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: 'images/verify/45-sky-zoomed-out.png' });

// Tilt toward the horizon to inspect the terrain/sky seam
await canvas.hover();
for (let i = 0; i < 5; i++) {
  await page.mouse.down();
  await page.mouse.move(800, 500);
  await page.mouse.move(800, 620, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: 'images/verify/46-sky-horizon-tilt.png' });

await browser.close();
console.log('DONE');
