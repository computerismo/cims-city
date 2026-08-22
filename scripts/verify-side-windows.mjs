import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1500);

// Research district framed from an angle so side/back facades face the camera.
const district = page.locator('.entity-label[data-label-id="elastocalorics"]');
if (await district.isVisible()) {
  await district.click();
} else {
  await page.locator('#organization-explorer button').filter({ hasText: /Elastocalorics/ }).first().click();
}
await page.waitForTimeout(1400);
await page.screenshot({ path: 'images/verify/49-side-windows-district.png' });

// Orbit a quarter turn to inspect the backs/sides that were bare before.
await page.mouse.move(800, 450);
await page.mouse.down();
await page.mouse.move(500, 450, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(800);
await page.screenshot({ path: 'images/verify/50-side-windows-orbit.png' });

// Soft lab: curtain-wall atrium, previously zero punched windows anywhere.
const lab = page.locator('.entity-label[data-label-id="soft-robotics-lab"]');
if (await lab.isVisible()) {
  await lab.click();
} else {
  await page.locator('#organization-explorer button').filter({ hasText: /Soft Robotic/ }).first().click();
}
await page.waitForTimeout(1400);
await page.screenshot({ path: 'images/verify/51-side-windows-softlab.png' });

await browser.close();
console.log('DONE');
