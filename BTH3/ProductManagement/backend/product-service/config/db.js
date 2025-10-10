import mongoose from 'mongoose';

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected (Product Service)');
    }catch(error){
        console.error('MongoDB connection failed (Product Service):', error);
        process.exit(1);
    }
};

export default connectDB;