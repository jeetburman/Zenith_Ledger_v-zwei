import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 3003;
const API_URL = process.env.API_URL || 'http://localhost:3001';
const USER_APP_URL = process.env.USER_APP_URL || 'http://localhost:3000';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ── Mock bank payment page ─────────────────────────────────
//
// GET /pay?token=xxx&amount=xxx&provider=xxx
//
// This is the page the user lands on after clicking
// "Add Money" in the dashboard. It shows a fake bank UI
// with Approve and Reject buttons.
//
// We return raw HTML directly from Express —
// no templating engine needed for a mock.
app.get('/pay', (req: Request, res: Response) => {
  const { token, amount, provider } = req.query;

  // Validate required query params
  if (!token || !amount) {
    res.status(400).send(`
      <html>
        <body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>Invalid payment link</h2>
          <p>Missing token or amount.</p>
        </body>
      </html>
    `);
    return;
  }

  // Convert paise to rupees for display
  const amountInRupees = (Number(amount) / 100).toFixed(2);

  // Return a simple but realistic-looking bank payment page
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Mock Bank — Payment</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f5f5f5;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .bank-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1px solid #eee;
        }
        .bank-logo {
          width: 36px;
          height: 36px;
          background: #1a1a2e;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 14px;
        }
        .bank-name { font-weight: 600; color: #1a1a2e; }
        .bank-tagline { font-size: 12px; color: #888; }
        .label {
          font-size: 12px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .value {
          font-size: 15px;
          color: #1a1a2e;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .amount-display {
          background: #f8f9ff;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 24px 0;
        }
        .amount-display .rupee {
          font-size: 36px;
          font-weight: 700;
          color: #1a1a2e;
        }
        .amount-display .sub {
          font-size: 13px;
          color: #888;
          margin-top: 4px;
        }
        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.9; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-approve {
          background: #1a1a2e;
          color: white;
          margin-bottom: 12px;
        }
        .btn-reject {
          background: #fff;
          color: #e53e3e;
          border: 1.5px solid #e53e3e;
        }
        .status {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
          color: #888;
          min-height: 20px;
        }
        .token-info {
          font-size: 11px;
          color: #bbb;
          text-align: center;
          margin-top: 16px;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="bank-header">
          <div class="bank-logo">MB</div>
          <div>
            <div class="bank-name">Mock Bank</div>
            <div class="bank-tagline">Secure Payment Gateway</div>
          </div>
        </div>

        <div class="label">Paying to</div>
        <div class="value">Zenith Ledger Wallet</div>

        <div class="label">Payment method</div>
        <div class="value">${provider || 'Net Banking'}</div>

        <div class="amount-display">
          <div class="rupee">₹${amountInRupees}</div>
          <div class="sub">Amount to be credited to your wallet</div>
        </div>

        <button
          class="btn btn-approve"
          id="approveBtn"
          onclick="processPayment('success')"
        >
          Approve Payment
        </button>

        <button
          class="btn btn-reject"
          id="rejectBtn"
          onclick="processPayment('failure')"
        >
          Reject / Cancel
        </button>

        <div class="status" id="status"></div>
        <div class="token-info">Ref: ${token}</div>
      </div>

      <script>
        async function processPayment(type) {
          const approveBtn = document.getElementById('approveBtn');
          const rejectBtn = document.getElementById('rejectBtn');
          const status = document.getElementById('status');

          // Disable both buttons to prevent double-clicking
          approveBtn.disabled = true;
          rejectBtn.disabled = true;
          status.textContent = 'Processing payment...';

          try {
            // Call the Express API webhook endpoint
            const endpoint = type === 'success'
              ? '${API_URL}/api/wallet/onramp/success'
              : '${API_URL}/api/wallet/onramp/failure';

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: '${token}' }),
            });

            const data = await res.json();

            if (res.ok) {
              status.textContent = type === 'success'
                ? '✓ Payment approved! Redirecting...'
                : '✗ Payment cancelled. Redirecting...';
              status.style.color = type === 'success' ? '#38a169' : '#e53e3e';

              // Redirect back to dashboard after 1.5 seconds
              setTimeout(() => {
                window.location.href = '${USER_APP_URL}/dashboard';
              }, 1500);
            } else {
              status.textContent = data.message || 'Payment failed';
              status.style.color = '#e53e3e';
              approveBtn.disabled = false;
              rejectBtn.disabled = false;
            }
          } catch (err) {
            status.textContent = 'Network error. Please try again.';
            status.style.color = '#e53e3e';
            approveBtn.disabled = false;
            rejectBtn.disabled = false;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ── Health check ───────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'mock-bank',
    timestamp: new Date().toISOString(),
  });
});

// Silence favicon requests from the browser
app.get('/favicon.ico', (req: Request, res: Response) => {
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │   Mock Bank                         │
  │   Running on http://localhost:${PORT}  │
  │   Payment page: /pay?token=&amount= │
  └─────────────────────────────────────┘
  `);
});