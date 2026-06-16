import mongoose from "mongoose";
import dns from "node:dns";

mongoose.set("bufferCommands", false);

const connectDB = async () => {
  try {
    if (process.env.DNS_SERVERS) {
      dns.setServers(
        process.env.DNS_SERVERS.split(",").map((server) => server.trim())
      );
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    console.log(
      `MongoDB Connected: ${conn.connection.host}`
    );

  } catch (error) {

    console.error(error.message);

    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }

    return null;
  }
};

export default connectDB;
