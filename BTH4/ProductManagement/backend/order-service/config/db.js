import mongoose from 'mongoose';

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected (Order Service)');
    }catch(error){
        console.error('MongoDB connection failed (Order Service):', error);
        process.exit(1);
    }
};

export default connectDB;
