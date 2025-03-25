const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { executablePath } = require('puppeteer');

const app = express();
app.use(cors());

const urls = [
  "https://www.autotrader.ca/cars/on/?rcp=15&rcs=0&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Coupe%2CHatchback%2CSedan&hprc=True&wcp=True&inMarket=advancedSearch"
];

app.get('/scrape', async (req, res) => {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const page = await browser.newPage();

  // Stealth JS tweaks
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    window.navigator.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3],
    });
  });

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });

  const listings = [];

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Simulate user interaction
      await page.evaluate(() => {
        window.dispatchEvent(new Event('mousemove'));
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('click'));
        localStorage.setItem('visited', 'true');
        sessionStorage.setItem('sessionActive', 'yes');
      });

      // Wait longer for scripts to evaluate and simulate human delay
      await new Promise(resolve => setTimeout(resolve, 5000));

      await page.waitForSelector('a.inner-link', { timeout: 15000 });

      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const data = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a.inner-link'));
        return anchors.map(anchor => {
          const title = anchor.querySelector('.title-with-trim')?.innerText.trim() || '';
          const price = anchor.querySelector('.price-amount')?.innerText.trim() || '';
          const location = anchor.querySelector('.proximity-text')?.innerText.trim() || '';
          const imageNodes = anchor.querySelectorAll('.image-gallery img');
          const photos = Array.from(imageNodes).map(img => img.src).filter(Boolean);
          return { source: 'AutoTrader', title, price, location, photos };
        });
      });

      listings.push(...data);
    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);
    }
  }

  await browser.close();
  res.json({ status: "done", count: listings.length, listings });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});
