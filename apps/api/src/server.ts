import 'dotenv/config';
import app from './app';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │   Zenith Ledger API                 │
  │   Running on http://localhost:${PORT}  │
  │   Health: http://localhost:${PORT}/health │
  └─────────────────────────────────────┘
  `);
});