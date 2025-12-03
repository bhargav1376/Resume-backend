const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

// Cache cookie
let cachedCookie = null;
let lastFetched = 0;

async function fetchCookie() {
  console.log("🔄 Fetching Perplexity Cloudflare cookie...");

  const browser = await puppeteer.launch({
    headless: true,               // FIX for Render
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-features=IsolateOrigins",
      "--disable-site-isolation-trials",
    ],
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

  console.log("✅ Cookie Updated");
  return cookieString;
}

async function getCookie() {
  if (!cachedCookie) return await fetchCookie();

  // refresh every 20 minutes
  if (Date.now() - lastFetched > 20 * 60 * 1000) {
    return await fetchCookie();
  }

  return cachedCookie;
}

module.exports = { getCookie };
