import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1280,
      height: 1024
    }
  });

  const page = await browser.newPage();

  // Navigate to the page
  await page.goto('http://localhost:5173/', {
    waitUntil: 'networkidle0',
    timeout: 10000
  });

  // Wait a bit for any animations or final renders
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Take a full page screenshot
  await page.screenshot({
    path: 'screenshot-styled-app.png',
    fullPage: true
  });

  console.log('Screenshot saved as screenshot-styled-app.png');

  await browser.close();
})();
