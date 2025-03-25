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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(urls[0], { waitUntil: 'load', timeout: 60000 });
    const rawHtml = await page.content();
    console.log("=== RAW HTML START ===");
    console.log(rawHtml.slice(0, 50000));  // Limit for Render logs
    console.log("=== RAW HTML END ===");

    res.json({ status: "dumped", length: rawHtml.length });
  } catch (err) {
    console.error("Failed to dump HTML:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scraper running on port ${PORT}`);
});
