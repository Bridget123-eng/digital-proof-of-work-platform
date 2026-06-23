import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const requiredCloudinaryKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
const missingCloudinaryKeys = requiredCloudinaryKeys.filter((key) => !String(process.env[key] || "").trim());

if (missingCloudinaryKeys.length) {
  console.warn(
    `[cloudinary] Cloudinary is not fully configured. Missing ${missingCloudinaryKeys.join(", ")}. Upload features may be unavailable.`
  );
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect after the server starts so health checks can report degraded status.
connectDB();
