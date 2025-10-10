import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected (auth-service)");
  } catch (error) {
    console.error("MongoDB connection error (auth-service):", error);
    process.exit(1);
  }
};

export default connectDB;
