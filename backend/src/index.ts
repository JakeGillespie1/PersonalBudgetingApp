import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import budgetRoutes from './routes/budgetRoutes';
import { verifyFirebaseToken } from './security/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(helmet());
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '256kb' }));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Routes
app.use('/api/budgets', verifyFirebaseToken, budgetRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Budgeting API',
    endpoints: ['/api/health', '/api/budgets/monthly', '/api/budgets/yearly/:year']
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Budgeting API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});