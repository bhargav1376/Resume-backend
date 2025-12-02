const express = require("express");
const axios = require("axios");
const router = express.Router();

// FIX: dynamic uuid import for ESM-only versions
const uuidv4 = async () => {
  const { v4 } = await import("uuid");
  return v4();
};

router.post("/compile-latex", async (req, res) => {
  console.log("\n========== NEW LATEX REQUEST ==========");

  try {
    const { latex } = req.body;

    console.log("Received LaTeX length:", latex?.length);

    if (!latex || !latex.trim()) {
      console.log("❌ ERROR: No LaTeX received");
      return res.status(400).json({ error: "LaTeX code required" });
    }

    // call dynamic uuid
    const uid = await uuidv4();
    console.log("Generated UID:", uid);

    const uploadUrl = `https://texviewer.herokuapp.com/upload.php?uid=${uid}`;
    console.log("Upload URL:", uploadUrl);

    const COOKIE_HEADER =
      "__gads=ID=a4d9fb76bb3806c4:T=1764498108:RT=1764498108:S=ALNI_MbSr30pe1ox9K4APP_m5LpynOoXjA; __gpi=UID=000011bf7496c651:T=1764498108:RT=1764498108:S=ALNI_MawDQ7TguPpRiEIY0tO1SPCTD64QA; FCCDCF=%5Bnull%2Cnull%2Cnull%2Cnull%2Cnull%2Cnull%2C%5B%5B32%2C%22%5B%5C%22139a6b5c-6322-4ead-a178-4943a4769d50%5C%22%2C%5B1764498108%2C858000000%5D%5D%22%5D%5D%5D; FCNEC=%5B%5B%22AKsRol-wOXktHUd7VbW8iAXlbXmNaietsmar47Yk1yJeMqGvvuE8YZXya50xkJs0N0fTzonj9ihGCXG52xBuB5eIlSE8Ub8Jk2r6V2q9YwhHfRjptUuSmGeIIJVsKIzlscQGtE9s4fKTB6iQSI7DO_vnCHrGMtuCgQ%3D%3D%22%5D%5D";

    const headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 6.0)",
      "Origin": "https://texviewer.herokuapp.com",
      "Referer": "https://texviewer.herokuapp.com/",
      "Cookie": COOKIE_HEADER,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    console.log("STEP 1 — Uploading LaTeX…");

    const form = new URLSearchParams();
    form.append("texts", latex);
    form.append("nonstopmode", "1");
    form.append("title", "Resume PDF");

    try {
      await axios.post(uploadUrl, form.toString(), { headers });
      console.log("✔ STEP 1 SUCCESS — LaTeX uploaded.");
    } catch (uploadErr) {
      console.error("❌ Upload error:", uploadErr.response?.data || uploadErr.message);
      return res.status(500).json({ error: "Upload to compiler failed" });
    }

    console.log("STEP 2 — Polling for PDF…");

    const checkUrl = "https://texviewer.herokuapp.com/upload.php?action=checkcomplete";
    let pdfUrl = null;

    for (let attempt = 1; attempt <= 12; attempt++) {
      console.log(`⏳ Poll attempt ${attempt}/12…`);

      await new Promise((r) => setTimeout(r, 1000));

      const checkForm = new URLSearchParams();
      checkForm.append("uid", uid);
      checkForm.append("resultfile", `temp/${uid}-result.txt`);

      let checkRes;
      try {
        checkRes = await axios.post(checkUrl, checkForm.toString(), { headers });
      } catch (pollErr) {
        console.error("❌ Polling error:", pollErr.message);
        continue;
      }

      console.log("Polling response:", checkRes.data);

      if (checkRes.data.pdfname) {
        pdfUrl = checkRes.data.pdfname;
        console.log("✔ PDF is ready:", pdfUrl);
        break;
      }
    }

    if (!pdfUrl) {
      console.log("❌ TIMEOUT — Texviewer never provided a PDF.");
      return res.status(500).json({ error: "PDF generation timeout" });
    }

    console.log("STEP 3 — Downloading PDF:", pdfUrl);

    let pdfRes;
    try {
      pdfRes = await axios.get(pdfUrl, { responseType: "arraybuffer" });
    } catch (downloadErr) {
      console.error("❌ PDF Download error:", downloadErr.message);
      return res.status(500).json({ error: "Failed downloading PDF" });
    }

    console.log("✔ PDF downloaded successfully. Size:", pdfRes.data.length);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=resume.pdf");
    return res.send(pdfRes.data);

  } catch (err) {
    console.error("❌ SERVER ERROR:", err.message);
    return res.status(500).json({ error: "Compile failed" });
  }
});

module.exports = router;
