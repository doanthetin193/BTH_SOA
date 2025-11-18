import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected (report-service)");
  } catch (error) {
    console.error("MongoDB connection error (report-service):", error);
    process.exit(1);
  }
};

export default connectDB;
