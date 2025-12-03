// utils/cloudflareCookie.js
// SAFE STUB – No bypassing, no puppeteer used.

function getCookie() {
  const cookie = process.env.PERPLEXITY_COOKIE;
  if (!cookie) throw new Error("PERPLEXITY_COOKIE is missing in environment variables");
  return cookie;
}

module.exports = {
  getCookie
};
