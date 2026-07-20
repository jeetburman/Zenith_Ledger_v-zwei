import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { startCurrencyPoller } from './modules/currency/currency.poller';
import app from './app';

const PORT = process.env.PORT || 3001;

// Create an HTTP server from the Express app.
// Socket.io needs the raw HTTP server, not just Express,
// because WebSockets upgrade from HTTP connections.
export const httpServer = http.createServer(app);

// Attach Socket.io to the HTTP server.
// cors config here mirrors the Express CORS config —
// both frontends need to connect via WebSocket too.
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      process.env.USER_APP_URL || 'http://localhost:3000',
      process.env.MERCHANT_APP_URL || 'http://localhost:3002',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Log when clients connect and disconnect
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │   Zenith Ledger API                 │
  │   Running on http://localhost:${PORT}  │
  │   WebSocket ready on ws://localhost:${PORT} │
  └─────────────────────────────────────┘
  `);
  startCurrencyPoller().catch(console.error);
});

