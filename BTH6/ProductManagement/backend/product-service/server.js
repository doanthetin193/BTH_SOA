// backend/product-service/server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import { registerService } from './config/consul.js';

dotenv.config({ path: './product-service/.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Consul (no logging)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'product-service' });
});

// Morgan logging (skip health checks)
app.use(morgan('dev', {
    skip: (req, res) => req.url === '/health'
}));

// Routes
app.use('/api/products', productRoutes);

// Connect DB & Start server
connectDB();
const PORT = process.env.PORT || 4001;
const SERVICE_NAME = 'product-service';

app.listen(PORT, async () => {
    console.log(`Product service running on port ${PORT}`);
    
    // Register with Consul
    await registerService(SERVICE_NAME, PORT);
});
