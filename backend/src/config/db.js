import mongoose from "mongoose";
import dns from "node:dns";

mongoose.set("bufferCommands", false);

const getMongoUri = () => process.env.MONGO_URI || process.env.DATABASE_URL || "";

const connectDB = async () => {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    console.warn("[database] MONGO_URI or DATABASE_URL is not set. Starting without a database connection.");
    return null;
  }

  try {
    if (process.env.DNS_SERVERS) {
      dns.setServers(
        process.env.DNS_SERVERS.split(",").map((server) => server.trim())
      );
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[database] ${error.message}`);

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }

    return null;
  }
};

export default connectDB;
