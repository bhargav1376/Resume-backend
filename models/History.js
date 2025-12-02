const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobDescription: { type: String, required: true },
    resumeName: { type: String, default: "Untitled Resume" },
    latexCode: { type: String, required: true },
    perplexityId: { type: String }, 
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.History ||
  mongoose.model("History", HistorySchema, "historystorage");
