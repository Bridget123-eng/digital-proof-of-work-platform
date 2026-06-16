import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import projectRoutes from "./routes/projectRoutes.js";
import portfolioRoutes from "./routes/portfolioRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

const app = express();

const allowedOrigins = new Set(
  [
    process.env.APP_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ]
    .flatMap((origin) => String(origin || "").split(","))
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

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
