import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import orderRoutes from './routes/orderRoutes.js';
import { registerService } from './config/consul.js';

dotenv.config({ path: './order-service/.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Consul (no logging)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'order-service' });
});

// Morgan logging (skip health checks)
app.use(morgan('dev', {
    skip: (req, res) => req.url === '/health'
}));

// Routes
app.use('/api/orders', orderRoutes);

// Connect DB & Start server
connectDB();
const PORT = process.env.PORT || 4002;
const SERVICE_NAME = 'order-service';

app.listen(PORT, async () => {
    console.log(`Order service running on port ${PORT}`);
    
    // Register with Consul
    await registerService(SERVICE_NAME, PORT);
});
