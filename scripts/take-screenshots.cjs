const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SHOTS_DIR = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

function shot(name) {
  return path.join(SHOTS_DIR, name);
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });

  console.log('Navigating to localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.innerText.includes('Club Practice 30'));
  console.log('State 1 loaded — taking screenshot');
  await page.screenshot({ path: shot('state1-round-select.png') });

  console.log('Clicking Club Practice 30...');
  await page.getByRole('button').filter({ hasText: 'Club Practice 30' }).click();
  await page.waitForSelector('select');
  await wait(300);
  console.log('State 2 loaded (no archer yet) — taking screenshot');
  await page.screenshot({ path: shot('state2a-no-archer.png') });

  await page.selectOption('select', { index: 1 });
  await page.waitForFunction(() => document.querySelector('input[type="radio"]') !== null);
  await wait(200);
  console.log('State 2 with archer + equipment — taking screenshot');
  await page.screenshot({ path: shot('state2b-archer-equipment.png') });

  console.log('Clicking Start Scoring...');
  await page.getByRole('button', { name: 'Start Scoring' }).click();
  await page.waitForFunction(() => document.body.innerText.includes('End 1'));
  await wait(300);
  console.log('State 3 — empty end — taking screenshot');
  await page.screenshot({ path: shot('state3a-empty-end.png') });

  async function clickArrow(v) {
    await page.locator(`button:text-is("${v}")`).click();
    await wait(100);
  }

  console.log('Entering X then 7 to show descending-order enforcement...');
  await clickArrow('X');
  await clickArrow('7');
  console.log('State 3 — X and 7 entered, higher buttons disabled — taking screenshot');
  await page.screenshot({ path: shot('state3b-descending-disabled.png') });

  for (const v of ['6', '5', '3', '1']) {
    await clickArrow(v);
  }
  await page.locator('button:text-is("Save End ›")').click();
  await wait(200);

  const midEnds = [
    ['X', '10', '9', '7', '5', 'M'],
    ['X', '9',  '8', '6', '4', '2'],
    ['10', '9', '8', '7', '6', '5'],
  ];
  for (let i = 0; i < midEnds.length; i++) {
    console.log(`Completing end ${i + 2}...`);
    for (const v of midEnds[i]) {
      await clickArrow(v);
    }
    await page.locator('button:text-is("Save End ›")').click();
    await wait(200);
  }

  console.log('Completing final end...');
  for (const v of ['X', '9', '7', '5', '3', '1']) {
    await clickArrow(v);
  }
  await page.locator('button:text-is("Finish Round ›")').click();

  await page.waitForFunction(() => document.body.innerText.includes('Round Complete'));
  await wait(300);
  console.log('State 4 — review — taking screenshot');
  await page.screenshot({ path: shot('state4-review.png') });

  console.log('Clicking Submit Score...');
  await page.locator('button:text-is("Submit Score")').click();
  await page.waitForFunction(() => document.body.innerText.includes('Score Recorded'));
  await wait(400);
  console.log('State 5 — confirmation — taking screenshot');
  await page.screenshot({ path: shot('state5-confirmation.png') });

  await browser.close();
  console.log('\nAll screenshots saved to screenshots/');

  const files = fs.readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png'));
  files.forEach(f => {
    const stat = fs.statSync(path.join(SHOTS_DIR, f));
    console.log(`  ${f}  (${Math.round(stat.size / 1024)} KB)`);
  });
})().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
