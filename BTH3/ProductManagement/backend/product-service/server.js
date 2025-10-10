// backend/product-service/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';

dotenv.config({ path: './product-service/.env' });

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/products', productRoutes);

// Connect DB & Start server
connectDB();
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Product service running on port ${PORT}`));
