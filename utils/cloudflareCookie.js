// utils/cloudflareCookie.js
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

let cachedCookie = null;
let lastFetched = 0;

/**
 * Fetch a fresh Cloudflare-bypassed cookie from Perplexity
 */
async function fetchCookie() {
  console.log("🔄 Fetching fresh Perplexity Cloudflare cookie...");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0"
  );

  await page.goto("https://www.perplexity.ai", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  const cookies = await page.cookies();
  await browser.close();

  const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  cachedCookie = cookieString;
  lastFetched = Date.now();

  console.log("✅ Cloudflare Cookie Updated!");
  return cookieString;
}

/**
 * Return cached cookie, or refresh if expired
 */
async function getCookie() {
  if (!cachedCookie) return fetchCookie();

  // Refresh every 20 minutes
  if (Date.now() - lastFetched > 20 * 60 * 1000) {
    return fetchCookie();
  }

  return cachedCookie;
}

module.exports = { getCookie };
