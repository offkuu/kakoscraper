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
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
    
    // Dostosuj selektory do Kakobuy!
    const price = await page.$eval('.price-selector', el => el.textContent.trim());
    const weight = await page.$eval('.weight-selector', el => el.textContent.trim()) || 'Nie znaleziono wagi';
    
    await browser.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ price, weight, url })
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: `Scraping failed: ${error.message}` }) 
    };
  }
};