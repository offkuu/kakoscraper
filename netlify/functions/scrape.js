const puppeteer = require('puppeteer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { url } = JSON.parse(event.body);
  
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Pobieranie ceny
    const price = await page.$eval('span.sku-price', el => {
      const priceText = el.textContent.trim();
      return priceText.includes('￥') ? priceText.split('￥')[1].trim() : priceText;
    });
    
    // Pobieranie wagi - nowa wersja dla podanej struktury
    const weights = await page.evaluate(() => {
      const weightElements = Array.from(document.querySelectorAll('div.past-item'));
      return weightElements.map(el => {
        if (el.textContent.includes('Weight(g):')) {
          const span = el.querySelector('span');
          return span ? span.textContent.trim() + 'g' : null;
        }
        return null;
      }).filter(Boolean);
    });
    
    // Wybieramy pierwszą znalezioną wagę (lub komunikat jeśli nie znaleziono)
    const weight = weights.length > 0 ? weights[0] : 'Waga nie znaleziona';
    
    await browser.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        price: `￥${price}`,
        weight: weight,
        allWeights: weights, // Dodatkowo zwracamy wszystkie znalezione wagi
        url 
      })
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: `Scraping failed: ${error.message}`,
        debug: `URL: ${url}`,
        note: 'Znaleziono następujące elementy wagi: ' + (weights || []).join(', ')
      }) 
    };
  }
};