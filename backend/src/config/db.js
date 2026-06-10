import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
  try {
    if (process.env.DNS_SERVERS) {
      dns.setServers(
        process.env.DNS_SERVERS.split(",").map((server) => server.trim())
      );
    }

    const conn = await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      `MongoDB Connected: ${conn.connection.host}`
    );

  } catch (error) {

    console.error(error.message);

    process.exit(1);
  }
};

export default connectDB;
