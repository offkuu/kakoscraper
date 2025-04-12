const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Brak URL' });

  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('.past-item');
    await page.waitForSelector('.sku-price');

    const data = await page.evaluate(() => {
      const weight = document.querySelector('.past-item span')?.textContent.trim();
      const priceText = document.querySelector('.sku-price')?.innerText;

      const cnyMatch = priceText?.match(/CNY\s*￥?([\d.]+)/);
      const plnMatch = priceText?.match(/≈\s*zł\s*([\d.]+)/);

      return {
        weight: weight + ' g',
        priceCNY: cnyMatch ? parseFloat(cnyMatch[1]) : null,
        pricePLN: plnMatch ? parseFloat(plnMatch[1]) : null
      };
    });

    await browser.close();
    res.json(data);
  } catch (err) {
    console.error('Scraper error:', err);
    res.status(500).json({ error: 'Błąd scrapera' });
  }
});

app.listen(3000, () => {
  console.log('Scraper backend działa na porcie 3000');
});