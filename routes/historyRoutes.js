// routes/historyRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const History = require("../models/History");

const router = express.Router();

/* ------------------ GET ALL HISTORY ------------------ */
router.get("/", protect, async (req, res) => {
  try {
    const items = await History.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      items,
    });
  } catch (err) {
    console.error("History GET error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------ CREATE NEW HISTORY ITEM ------------------ */
router.post("/", protect, async (req, res) => {
  try {
    const { latex, resumeName } = req.body;

    if (!latex) {
      return res.status(400).json({
        success: false,
        error: "LaTeX code required"
      });
    }

    const item = await History.create({
      user: req.user._id,
      latex,
      resumeName: resumeName || "Untitled Resume",
    });

    return res.json({
      success: true,
      item,
    });
  } catch (err) {
    console.error("History CREATE error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------ RENAME RESUME ------------------ */
router.put("/:id/rename", protect, async (req, res) => {
  try {
    const { newName } = req.body;

    if (!newName || newName.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Resume name cannot be empty"
      });
    }

    const item = await History.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Resume not found"
      });
    }

    item.resumeName = newName;
    await item.save();

    return res.json({
      success: true,
      message: "Resume name updated",
      item,
    });
  } catch (err) {
    console.error("Rename error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------ DELETE ONE HISTORY ITEM ------------------ */
router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await History.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found",
      });
    }

    await item.deleteOne();

    return res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("History DELETE error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
