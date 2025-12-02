const express = require("express");
const router = express.Router();
const Latex = require("../models/Latex");
const { protect } = require("../middleware/authMiddleware");

// GET latex
router.get("/", protect, async (req, res) => {
  const doc = await Latex.findOne({ user: req.user._id });
  res.json({ latex: doc ? doc.latex : "" });
});

// SAVE / UPDATE latex
router.post("/", protect, async (req, res) => {
  const { latex } = req.body;

  let doc = await Latex.findOne({ user: req.user._id });

  if (!doc) {
    doc = await Latex.create({ user: req.user._id, latex });
  } else {
    doc.latex = latex;
    await doc.save();
  }

  res.json({ success: true });
});

// DELETE latex
router.delete("/", protect, async (req, res) => {
  await Latex.deleteOne({ user: req.user._id });
  res.json({ success: true });
});

module.exports = router;
