import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import connectDB from './config/db.js';
import morgan from 'morgan';
import { registerService } from './config/consul.js';

dotenv.config({ path: './auth-service/.env' });

const app = express();

//middleware
app.use(cors());
app.use(express.json());

// Health check endpoint for Consul (no logging)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'auth-service' });
});

// Morgan logging (skip health checks)
app.use(morgan('dev', {
    skip: (req, res) => req.url === '/health'
}));

//routes
app.use('/api/auth', authRoutes);

//connect to DB and start server
connectDB();

const PORT = process.env.PORT || 4000;
const SERVICE_NAME = 'auth-service';

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Register with Consul
    await registerService(SERVICE_NAME, PORT);
});
