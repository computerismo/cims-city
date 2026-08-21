import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('images/verify', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto('http://localhost:5199/', { waitUntil: 'load' });
await page.waitForSelector('.app-shell[data-webgl-status="ready"]', { timeout: 30000 });
await page.waitForTimeout(1500);

await page.screenshot({ path: 'images/verify/40-typography-shell.png' });

async function focusEntity(labelId, namePattern, shot) {
  const label = page.locator(`.entity-label[data-label-id="${labelId}"]`);
  if (await label.isVisible()) {
    await label.click();
  } else {
    await page.locator('#organization-explorer button').filter({ hasText: namePattern }).first().click();
  }
  await page.waitForTimeout(1400);
  await page.screenshot({ path: shot });
}

await focusEntity('elastocalorics', /Elastocalorics/, 'images/verify/41-focus-group.png');
await focusEntity('cims-hub', /Hub/, 'images/verify/42-focus-hub.png');

await browser.close();
console.log('DONE');
