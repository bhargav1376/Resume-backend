// routes/optimizeRoutes.js
const express = require("express");
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const History = require("../models/History");
const router = express.Router();

const { getCookie } = require("../utils/cloudflareCookie");

const PERPLEXITY_TIMEZONE = process.env.PERPLEXITY_TIMEZONE || "Asia/Kolkata";

/* ---------------- Helpers ---------------- */

function sanitizeLatex(latex) {
  if (!latex) return "";
  let s = latex.trim();
  s = s.replace(/^\s*```[\w-]*\s*$/gm, "");
  s = s.replace(/```/g, "");
  const endMatch = s.match(/\\end{document}/i);
  if (endMatch) {
    const idx = s.toLowerCase().indexOf("\\end{document}");
    s = s.slice(0, idx + "\\end{document}".length);
  }
  return s.trim();
}

function extractLatexCode(text) {
  if (!text) return null;

  let m = text.match(/```(?:latex|tex)\s*([\s\S]*?)```/i);
  if (m) return sanitizeLatex(m[1]);

  m = text.match(/```[\w-]*\s*([\s\S]*?)```/i);
  if (m && (m[1].includes("\\documentclass") || m[1].includes("\\begin{document}"))) {
    return sanitizeLatex(m[1]);
  }

  const start = text.indexOf("\\documentclass");
  if (start !== -1) {
    const slice = text.slice(start);
    const endMatch = slice.match(/\\end{document}/i);
    if (endMatch) {
      const endIndex = start + endMatch.index + "\\end{document}".length;
      return sanitizeLatex(text.slice(start, endIndex));
    }
    return sanitizeLatex(slice);
  }

  return null;
}

/* ---------------- Perplexity Call ---------------- */

async function askPerplexity(query) {
  const cookie = await getCookie();

  const url = "https://www.perplexity.ai/rest/sse/perplexity_ask";

  const payload = {
    params: {
      attachments: [],
      language: "en-US",
      timezone: PERPLEXITY_TIMEZONE,
      search_focus: "internet",
      sources: ["web"],
      frontend_uuid: "fae808a1-d386-4d43-85ff-cbdede546228",
      mode: "copilot",
      model_preference: "gemini2flash",
      query_source: "home",
      dsl_query: query,
      version: "2.18",
    },
    query_str: query,
  };

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0",
    "Content-Type": "application/json",
    Referer: "https://www.perplexity.ai/",
    Origin: "https://www.perplexity.ai",
    Cookie: cookie,
  };

  try {
    const res = await axios.post(url, payload, {
      headers,
      responseType: "text",
      timeout: 120000,
    });

    let finalAnswer = null;

    for (const rawLine of res.data.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;

      const jsonString = line.slice(5).trim();
      if (!jsonString) continue;

      let obj;
      try {
        obj = JSON.parse(jsonString);
      } catch {
        continue;
      }

      if (obj.final || obj.status === "COMPLETED") {
        const blocks = obj.blocks || [];
        for (const block of blocks) {
          if (block.markdown_block?.answer) {
            finalAnswer = block.markdown_block.answer;
            break;
          }
        }
      }
    }

    if (!finalAnswer) throw new Error("No final answer received from Perplexity");
    return finalAnswer;
  } catch (err) {
    console.error("❌ Perplexity API Error:", err.response?.status);

    if (err.response?.status === 403) {
      console.log("⚠ Cookie expired — fetching new one...");
      await getCookie();
      return askPerplexity(query);
    }

    throw err;
  }
}

/* ---------------- Default Template ---------------- */

const DEFAULT_LATEX_TEMPLATE = `
\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{lmodern}
\\pagestyle{empty}

\\setlength{\\parindent}{0pt}
\\setlength{\\itemsep}{0pt}

\\begin{document}

\\begin{center}
{\\huge \\textbf{Your Full Name}}
\\end{center}

\\begin{center}
Email | Phone | Location | LinkedIn | GitHub
\\end{center}

\\vspace{10pt}

\\section*{Professional Summary}
A short ATS-friendly professional summary goes here.

\\vspace{10pt}

\\section*{Education}
\\textbf{College Name} — Degree (Years) \\\\
CGPA: X.XX/10

\\vspace{10pt}

\\section*{Experience}
\\textbf{Role Title} — Company Name (Years) \\\\
\\begin{itemize}[leftmargin=1em]
  \\item Add achievements here.
  \\item Add accomplishments relevant to job description.
\\end{itemize}

\\vspace{10pt}

\\section*{Projects}
\\textbf{Project Title} \\\\
\\begin{itemize}[leftmargin=1em]
  \\item Bullet point describing your project.
  \\item Bullet point describing impact or tech used.
\\end{itemize}

\\vspace{10pt}

\\section*{Technologies}
\\textbf{Programming:} \\\\
\\textbf{Frontend:} \\\\
\\textbf{Backend:} \\\\
\\textbf{Cloud:} \\\\
\\textbf{DevOps:} \\\\
\\textbf{Databases:} \\\\
\\textbf{Tools \\& Platforms:} \\\\
\\textbf{Knowledge:}

\\end{document}
`;

/* ----------------------------------------------------------
    POST /api/optimize
---------------------------------------------------------- */
router.post("/", protect, async (req, res) => {
  try {
    const jobDescription = (req.body.jobDescription || "").trim();
    const latexTemplate = (req.body.latexTemplate || "").trim();

    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription cannot be empty" });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const isFresher = /fresher|entry level|no experience|testing fresher/.test(
      jobDescription.toLowerCase()
    );

    const fresherRules = isFresher
      ? `
IMPORTANT:
- REMOVE the Experience section completely.
- ADD this section instead:
  \\section*{Certificates}
  \\begin{itemize}[leftmargin=1em]
    \\item Manual Testing Certificate
    \\item API Testing Certificate
    \\item SQL Basics Certification
    \\item Automation Testing Beginner Certificate
  \\end{itemize}
`
      : `
IMPORTANT:
- User has experience → Keep and optimize Experience section.
`;

    const baseLatex = latexTemplate || DEFAULT_LATEX_TEMPLATE;

    const prompt = `
You are an expert ATS resume optimizer.

BASE LATEX RESUME:
${baseLatex}

JOB DESCRIPTION:
${jobDescription}

${fresherRules}

TASK:
- Update ONLY the professional summary, experience bullets, projects, and technologies
- Inject relevant ATS keywords from the job description
- Keep it one page (no overflow)
- Maintain valid LaTeX
- Return ONLY full LaTeX (start with \\documentclass, end with \\end{document})
`;

    const perplexityAnswer = await askPerplexity(prompt);
    const latexCode = extractLatexCode(perplexityAnswer);

    if (!latexCode) {
      return res.status(400).json({ error: "Could not extract LaTeX" });
    }

    let resumeName = "Generated Resume";
    const firstLine = jobDescription.split("\n")[0];
    const clean = firstLine.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    if (clean) resumeName = `${clean.slice(0, 20)} Resume`;

    const history = await History.create({
      user: userId,
      jobDescription,
      latexCode,
      resumeName,
    });

    return res.json({
      success: true,
      latex_code: latexCode,
      historyId: history._id,
      resumeName,
    });
  } catch (err) {
    console.error("Optimize error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------------------------------------------
    PUT /api/optimize/latest
---------------------------------------------------------- */
router.put("/latest", protect, async (req, res) => {
  try {
    const latexCode = (req.body.latexCode || "").trim();
    if (!latexCode) return res.status(400).json({ error: "latexCode required" });

    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const history = await History.findOne({ user: userId }).sort({ createdAt: -1 });
    if (!history) return res.status(404).json({ error: "No history found" });

    history.latexCode = latexCode;
    await history.save();

    return res.json({
      success: true,
      message: "History updated",
      historyId: history._id,
    });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
