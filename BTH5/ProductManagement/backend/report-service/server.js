import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import reportRoutes from './routes/reportRoutes.js';
import { registerService } from './config/consul.js';

dotenv.config({ path: './report-service/.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Consul (no logging)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'report-service' });
});

// Morgan logging (skip health checks)
app.use(morgan('dev', {
    skip: (req, res) => req.url === '/health'
}));

// Routes
app.use('/api/reports', reportRoutes);

// Connect DB & Start server
connectDB();
const PORT = process.env.PORT || 4003;
const SERVICE_NAME = 'report-service';

app.listen(PORT, async () => {
    console.log(`Report service running on port ${PORT}`);
    
    // Register with Consul
    await registerService(SERVICE_NAME, PORT);
});
