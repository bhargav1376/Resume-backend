// utils/perplexityClient.js
const puppeteer = require("puppeteer-extra");
const Stealth = require("puppeteer-extra-plugin-stealth");
const { v4: uuidv4 } = require("uuid");

puppeteer.use(Stealth());

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------
   Step 1: Get Perplexity session cookie
------------------------------------------------ */
async function fetchSessionCookie() {
  console.log("Trying to fetch Perplexity cookie (Cloudflare bypass)…");

  const browser = await puppeteer.launch({
    headless: false, // MUST be false, Cloudflare blocks headless
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",

      // Hide browser offscreen
      "--window-size=1,1",
      "--window-position=-2000,-2000",
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/123 Safari/537.36"
  );

  await page.goto("https://www.perplexity.ai/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // Let Cloudflare verification complete
  await delay(8000);

  const cookies = await page.cookies();

  await browser.close();

  const session = cookies.find((c) => c.name === "__Host-perplexity_session");
  if (!session) throw new Error("Cloudflare blocked session cookie.");

  return `${session.name}=${session.value}`;
}

/* ------------------------------------------------
   Step 2: Ask Perplexity using SSE REST endpoint
------------------------------------------------ */
async function askPerplexity(prompt) {
  const cookie = await fetchSessionCookie();
  const frontendUUID = uuidv4(); // <<< ADDED

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    Cookie: cookie,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/123 Safari/537.36",
  });

  await page.goto("https://www.perplexity.ai/", {
    waitUntil: "networkidle2",
    timeout: 40000,
  });

  console.log("Sending prompt (headless)…");

  const answer = await page.evaluate(
    async (userPrompt, uuidVal) => {
      const payload = {
        params: {
          attachments: [],
          language: "en-US",
          timezone: "Asia/Kolkata",
          search_focus: "internet",
          sources: ["web"],
          frontend_uuid: "fae808a1-d386-4d43-85ff-cbdede546228",
          model_preference: "gemini2flash",
          mode: "copilot",
          query_source: "home",
          dsl_query: userPrompt,
          version: "2.18",
        },
        query_str: userPrompt,
      };

      const res = await fetch(
        "https://www.perplexity.ai/rest/sse/perplexity_ask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const raw = await res.text();
      const lines = raw.split("\n");

      let finalAnswer = "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        try {
          const json = JSON.parse(line.slice(5).trim());

          if (json.final || json.status === "COMPLETED") {
            for (const b of json.blocks || []) {
              if (b?.markdown_block?.answer) {
                finalAnswer = b.markdown_block.answer;
              }
            }
          }
        } catch {}
      }

      return finalAnswer;
    },
    prompt,
    frontendUUID
  );

  await browser.close();

  if (!answer) throw new Error("No response from Perplexity");

  return answer;
}

module.exports = { askPerplexity };
