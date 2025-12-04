// routes/optimizeRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const History = require("../models/History");

const { askPerplexity } = require("../utils/perplexityClient");

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

  // ```latex ... ```
  let m = text.match(/```(?:latex|tex)\s*([\s\S]*?)```/i);
  if (m) return sanitizeLatex(m[1]);

  // ```anything ... ```
  m = text.match(/```[\w-]*\s*([\s\S]*?)```/i);
  if (m && (m[1].includes("\\documentclass") || m[1].includes("\\begin{document}"))) {
    return sanitizeLatex(m[1]);
  }

  // fallback: search whole LaTeX doc
  const start = text.indexOf("\\documentclass");
  if (start !== -1) {
    const slice = text.slice(start);
    const end = slice.indexOf("\\end{document}");
    if (end !== -1) {
      return sanitizeLatex(slice.slice(0, end + "\\end{document}".length));
    }
    return sanitizeLatex(slice);
  }

  return null;
}

/* ---------------- Default LaTeX Template ---------------- */

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
Tech 1, Tech 2, Tech 3

\\end{document}
`;

/* ---------------- Optimize Resume Route ---------------- */

router.post("/", protect, async (req, res) => {
  try {
    const jobDescription = (req.body.jobDescription || "").trim();
    const latexTemplate = (req.body.latexTemplate || "").trim();
    const userId = req.user?._id;

    if (!jobDescription)
      return res.status(400).json({ error: "jobDescription cannot be empty" });

    if (!userId)
      return res.status(401).json({ error: "Not authenticated" });

    const isFresher = /fresher|entry level|no experience/.test(
      jobDescription.toLowerCase()
    );

    const fresherRules = isFresher
      ? `
IMPORTANT:
- REMOVE Experience section completely.
- ADD Certificates section.
`
      : `
IMPORTANT:
- User has experience → optimize Experience section normally.
`;

    const baseLatex = latexTemplate || DEFAULT_LATEX_TEMPLATE;

    const prompt = `
You are an ATS resume optimization expert.

BASE LATEX RESUME:
${baseLatex}

JOB DESCRIPTION:
${jobDescription}

${fresherRules}

TASK:
- Update ONLY summary, experience, projects, and technologies.
- Insert ATS keywords.
- Keep layout same.
- Return ONLY valid LaTeX from \\documentclass to \\end{document}.
`;

    // Get response from Perplexity (background, no UI)
    const perplexityText = await askPerplexity(prompt);

    const latexCode = extractLatexCode(perplexityText);

    if (!latexCode) {
      return res.status(400).json({
        error: "Could not extract LaTeX",
        raw: perplexityText
      });
    }

    const history = await History.create({
      user: userId,
      jobDescription,
      latexCode,
      resumeName: "Optimized Resume"
    });

    return res.json({
      success: true,
      latex_code: latexCode,
      historyId: history._id
    });

  } catch (err) {
    console.error("Optimize error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- Save Latest ---------------- */

router.put("/latest", protect, async (req, res) => {
  try {
    const latexCode = (req.body.latexCode || "").trim();
    const userId = req.user?._id;

    if (!latexCode)
      return res.status(400).json({ error: "latexCode cannot be empty" });

    if (!userId)
      return res.status(401).json({ error: "Not authenticated" });

    const history = await History.findOne({ user: userId }).sort({
      createdAt: -1
    });

    if (!history)
      return res.status(404).json({ error: "No history found" });

    history.latexCode = latexCode;
    await history.save();

    res.json({
      success: true,
      message: "Updated successfully",
      historyId: history._id
    });

  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
