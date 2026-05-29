const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log('[BROWSER-CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[PAGE-ERROR]', err.message));

  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[aria-label="Adresse e-mail"]', 'runtime.tester@example.com');
  await page.fill('input[aria-label="Mot de passe"]', 'runtime123');
  await page.click('button:has-text("Se connecter")');
  await page.waitForURL('http://localhost:5173/dashboard', { timeout: 120000 });

  await page.goto('http://localhost:5173/feed', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('article', { timeout: 120000 });

  const initial = await page.evaluate(() => ({
    articleCount: document.querySelectorAll('article').length,
    summary: document.querySelector('.feed-summary-row')?.textContent?.trim() || null,
    debug: window.__FEED_DEBUG__ || null,
    loaderText: document.querySelector('.feed-main')?.textContent?.includes('Tu as tout vu') || false,
  }));
  console.log('INITIAL', JSON.stringify(initial));

  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (let i = 0; i < 3; i++) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await wait(2000);
    }
  });
  await page.waitForTimeout(4000);

  const after = await page.evaluate(() => ({
    articleCount: document.querySelectorAll('article').length,
    summary: document.querySelector('.feed-summary-row')?.textContent?.trim() || null,
    debug: window.__FEED_DEBUG__ || null,
    hasMoreText: document.body.textContent.includes('Tu as tout vu'),
  }));
  console.log('AFTER_SCROLL', JSON.stringify(after));

  await browser.close();
})();
