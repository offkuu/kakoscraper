const puppeteer = require('puppeteer');

exports.handler = async (event, context) => {
  // Dodaj logging na start
  console.log('Funkcja rozpoczęta', new Date().toISOString());
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { url } = parsedBody;
  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing URL parameter' })
    };
  }

  console.log('Przetwarzanie URL:', url);

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    console.log('Strona załadowana');

    // Pobieranie ceny
    let price = 'Nie znaleziono';
    try {
      price = await page.$eval('span.sku-price', el => {
        const priceText = el.textContent.trim();
        return priceText.includes('￥') ? priceText.split('￥')[1].trim() : priceText;
      });
    } catch (e) {
      console.error('Błąd pobierania ceny:', e.message);
    }

    // Pobieranie wagi
    let weight = 'Nie znaleziono';
    try {
      weight = await page.evaluate(() => {
        const weightElement = [...document.querySelectorAll('div.past-item')]
          .find(el => el.textContent.includes('Weight(g):'));
        return weightElement?.querySelector('span')?.textContent.trim() + 'g' || 'Nie znaleziono';
      });
    } catch (e) {
      console.error('Błąd pobierania wagi:', e.message);
    }

    await browser.close();

    console.log('Sukcess:', { price, weight });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        price: price,
        weight: weight,
        url: url
      })
    };
  } catch (error) {
    console.error('Critical error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};