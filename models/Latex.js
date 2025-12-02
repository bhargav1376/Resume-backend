const mongoose = require("mongoose");

const latexSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  latex: { type: String, required: false }
}, { timestamps: true   });

module.exports = mongoose.models.LatexCode || mongoose.model("LatexCode", latexSchema);
