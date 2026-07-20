import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './shared/middleware/errorHandler';
import { notFound } from './shared/middleware/notFound';
import cookieParser from 'cookie-parser';

const app = express();

// ─── Security ──────────────────────────────────────────────
// helmet() sets ~14 HTTP response headers that protect
// against common attacks: XSS, clickjacking, MIME sniffing
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────
// Allows our Next.js apps on different ports to call this API.
// credentials: true is required for NextAuth session cookies
// to be sent cross-origin.
app.use(
  cors({
    origin: [
      process.env.USER_APP_URL || 'http://localhost:3000',
      process.env.MERCHANT_APP_URL || 'http://localhost:3002',
    ],
    credentials: true,
  })
);

// ─── Body parsing ──────────────────────────────────────────
// Parse incoming JSON request bodies into req.body
app.use(express.json());
app.use(cookieParser());

// ─── Request logging ───────────────────────────────────────
// morgan('dev') logs: METHOD /path STATUS ms
// Example: POST /api/wallet/send 200 12ms
app.use(morgan('dev'));

// ─── Health check ──────────────────────────────────────────
// Simple endpoint to confirm the server is alive.
// Used by Docker, CI, and load balancers later.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'zenith-ledger-api',
    timestamp: new Date().toISOString(),
  });
});

import { authMiddleware } from './shared/middleware/authMiddleware';

app.get('/api/protected-test', authMiddleware, (req, res) => {
  res.json({
    message: 'You are authenticated',
    user: req.user,
  });
});

// Route imports : 
import authRouter from './modules/auth/auth.router';
import walletRouter from './modules/wallet/wallet.router';
import transactionRouter from './modules/transactions/transaction.router';

// ─── Routes ────────────────────────────────────────────────
// Each module's router gets mounted here as we build them.
app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/transactions', transactionRouter);
// app.use('/api/merchant', merchantRouter);
// app.use('/api/currency', currencyRouter);
// app.use('/api/expenses', expenseRouter);

// ─── 404 handler ───────────────────────────────────────────
// Catches any request that didn't match a route above
app.use(notFound);

// ─── Error handler ─────────────────────────────────────────
// Must be LAST — Express identifies error handlers
// by the 4-argument signature (err, req, res, next)
app.use(errorHandler);

export default app;