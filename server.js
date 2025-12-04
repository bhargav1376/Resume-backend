// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/latex", require("./routes/latexRoutes"));
app.use("/api/history", require("./routes/historyRoutes"));
app.use("/api", require("./routes/latexCompile"));
app.use("/api/optimize", require("./routes/optimizeRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "API running" });
});

const PORT = process.env.PORT || 5001;

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB Connection Error:", err));
