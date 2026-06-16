import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import projectRoutes from "./routes/projectRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

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

app.use("/api", (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      message: "Database unavailable. Please confirm MongoDB is reachable and try again.",
    });
  }

  next();
});

app.use("/api/portfolio", portfolioRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/system", systemRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
  });
});

export default app;
