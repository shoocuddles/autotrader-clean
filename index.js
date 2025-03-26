const express = require("express");
const cors = require("cors");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const chromium = require("chrome-aws-lambda");

puppeteerExtra.use(StealthPlugin());

const app = express();
app.use(cors());

const SEARCH_URLS = {
  car: "https://www.autotrader.ca/cars/on/?rcp=30&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Coupe%2CHatchback%2CSedan&hprc=True&wcp=True&inMarket=advancedSearch",
  suv: "https://www.autotrader.ca/cars/on/?rcp=30&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=SUV&hprc=True&wcp=True&inMarket=advancedSearch",
  truck: "https://www.autotrader.ca/cars/on/?rcp=30&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Truck&hprc=True&wcp=True&inMarket=advancedSearch",
  van: "https://www.autotrader.ca/cars/on/?rcp=30&srt=35&pRng=10000%2C20000&prx=-2&prv=Ontario&loc=K0H2B0&body=Minivan&hprc=True&wcp=True&inMarket=advancedSearch"
};

app.get("/scrape", async (req, res) => {
  const type = req.query.type || "car";
  const url = SEARCH_URLS[type.toLowerCase()] || SEARCH_URLS.car;

  const browser = await puppeteerExtra.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
  );
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector(".result-item", { timeout: 15000 });

    const listings = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll(".result-item");
      for (let el of items) {
        const title = el.querySelector(".result-title")?.innerText?.trim() || "";
        const price = el.querySelector(".price-amount")?.innerText?.trim() || "";
        const location = el.querySelector(".proximity-text")?.innerText?.trim() || "";
        const odometer = el.querySelector(".kms")?.innerText?.trim() || "";

        const photos = Array.from(el.querySelectorAll("img")).map(img =>
          (img.src || "").replace(/\.jpg.*$/, ".jpg")
        ).filter(p => p.includes(".jpg"));

        results.push({
          title,
          price,
          location,
          odometer,
          photos: [...new Set(photos)],
          source: "AutoTrader"
        });
      }
      return results;
    });

    res.json({ status: "done", count: listings.length, listings });
  } catch (err) {
    console.error("Scraping failed:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Scraper running on port", PORT);
});