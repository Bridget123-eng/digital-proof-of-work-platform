import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const requestedPort = Number(process.env.PORT || 5000);
const PORT = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : 5000;

const requiredCloudinaryKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const missingCloudinaryKeys = requiredCloudinaryKeys.filter((key) => !String(process.env[key] || "").trim());

if (missingCloudinaryKeys.length) {
  console.warn(
    `[cloudinary] Cloudinary is not fully configured. Missing ${missingCloudinaryKeys.join(", ")}. Upload features may be unavailable.`
  );
}

let server;

const startServer = async () => {
  let currentPort = PORT;
  let lastError = null;

  while (currentPort < PORT + 5) {
    try {
      server = await new Promise((resolve, reject) => {
        const listener = app.listen(currentPort, () => resolve(listener));
        listener.on("error", reject);
      });

      console.log(`Server running on port ${currentPort}`);
      break;
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        lastError = error;
        console.warn(`[server] Port ${currentPort} is busy. Trying ${currentPort + 1}...`);
        currentPort += 1;
        continue;
      }

      throw error;
    }
  }

  if (!server) {
    throw lastError || new Error("Unable to start server");
  }

  await connectDB();
};

const shutdown = (signal) => {
  console.log(`[server] Received ${signal}. Shutting down...`);
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  console.error(`[server] Startup failed: ${error.message}`);
  process.exit(1);
});
