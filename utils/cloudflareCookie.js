// utils/cloudflareCookie.js
// Generic Puppeteer helper – NOT for bypassing Cloudflare or any other protection.

const puppeteer = require("puppeteer-core");

// Launch a browser instance using the Chromium we installed in Docker.
async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  return browser;
}

/**
 * Example helper: open a page and return its title.
 * Use this pattern for allowed automation tasks (your own app, testing, etc.).
 */
async function getPageTitle(url) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const title = await page.title();
    return title;
  } finally {
    await browser.close();
  }
}

// For Perplexity / Cloudflare-protected services, rely on official APIs
// and use process.env.PERPLEXITY_COOKIE directly instead of trying to
// scrape or bypass their protection here.

module.exports = {
  launchBrowser,
  getPageTitle,
};
