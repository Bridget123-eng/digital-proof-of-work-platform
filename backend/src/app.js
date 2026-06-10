import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import projectRoutes from "./routes/projectRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const dbReadyState = mongoose.connection.readyState;
  const isDbConnected = dbReadyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? "ok" : "degraded",
    service: "digital-proof-of-work-platform-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStateMap[dbReadyState] || "unknown",
      readyState: dbReadyState,
    },
  });
});

app.use("/api/portfolio", portfolioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);

export default app;