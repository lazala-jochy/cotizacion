const fs = require('fs');

function resolveChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function generatePdfFromHtmlPuppeteer(html) {
  const puppeteer = require('puppeteer-core');
  const executablePath = resolveChromeExecutable();
  if (!executablePath) {
    throw new Error(
      'No se encontró Chrome para generar el PDF en desarrollo. Instala Google Chrome o define PUPPETEER_EXECUTABLE_PATH.'
    );
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdfFromHtmlPuppeteer, resolveChromeExecutable };
