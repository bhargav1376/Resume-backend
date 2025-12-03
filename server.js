const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { getCookie } = require("./utils/cloudflareCookie");

// Force puppeteer path for Render
process.env.PUPPETEER_EXECUTABLE_PATH = "/usr/bin/chromium";

const app = express();

app.use(cors());
app.use(express.json());

// Warm-up CF cookie
getCookie().catch(err => console.log("⚠ Cookie warmup failed:", err.message));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/latex", require("./routes/latexRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api", require("./routes/latexCompile"));
app.use("/api/optimize", require("./routes/optimizeRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((err) => console.error(err));
