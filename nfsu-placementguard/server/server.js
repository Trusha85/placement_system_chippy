import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initializeDatabase } from './db/database.js';
import { validateOrigin } from './middleware/auth.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import driveRoutes from './routes/driveRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'nfsu-placementguard-super-secret-key-2026';
const IS_PROD = process.env.NODE_ENV === 'production';

// Initialize SQLite database tables
initializeDatabase();

// 1. Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible local dev and Vite assets
  crossOriginEmbedderPolicy: false
}));

// 2. CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, postman) or matching allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly permissive for local hackathon judging
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Rate Limiting on Authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min window (generous for hackathon judging)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});
app.use('/api/auth/login', authLimiter);

// 5. Server-side session configuration
app.use(session({
  name: 'nfsu_pg_sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// 6. CSRF Origin validation for mutating requests
app.use('/api', validateOrigin);

// 7. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'NFSU PlacementGuard Enterprise API',
    timestamp: new Date().toISOString(),
    sessionActive: Boolean(req.session?.user)
  });
});

// 8. Serve client in production or fallback
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// 9. Centralized Error Handler (no stack leaks in production)
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: IS_PROD ? 'An unexpected server error occurred.' : err.message
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🛡️  NFSU PlacementGuard API Server Running`);
  console.log(`  🔗  URL: http://localhost:${PORT}`);
  console.log(`  🔒  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});
