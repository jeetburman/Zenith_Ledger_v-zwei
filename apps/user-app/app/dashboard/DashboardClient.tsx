'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { apiClient } from '../../lib/apiClient';

interface Balance {
  amount: number;
  locked: number;
  available: number;
}

interface Transfer {
  id: number;
  amount: number;
  status: string;
  timestamp: string;
  direction: 'sent' | 'received';
  counterparty: {
    id: number;
    name: string | null;
    number: string;
  };
}

interface Props {
  session: any;
}

export default function DashboardClient({ session }: Props) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Send money form state
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  // Fetch balance and history on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [balanceRes, historyRes] = await Promise.all([
        apiClient.get<{ status: string; data: Balance }>(
          '/api/wallet/balance'
        ),
        apiClient.get<{ status: string; data: Transfer[] }>(
          '/api/transactions/history'
        ),
      ]);
      setBalance(balanceRes.data);
      setTransfers(historyRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError('');
    setSendSuccess('');
    setSending(true);

    try {
      // Convert rupees to paise before sending to API
      // The API and DB always work in paise
      const amountInPaise = Math.round(parseFloat(sendAmount) * 100);

      await apiClient.post('/api/transactions/send', {
        toUserNumber: sendTo,
        amount: amountInPaise,
      });

      setSendSuccess(`₹${sendAmount} sent to ${sendTo}`);
      setSendTo('');
      setSendAmount('');

      // Refresh balance and history after sending
      fetchDashboardData();
    } catch (err: any) {
      setSendError(err.message || 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  // Format paise to rupees for display
  const formatAmount = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your wallet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">
          Zenith Ledger
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {session.user?.name}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Balance card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Available balance</p>
          <p className="text-4xl font-semibold text-gray-900">
            {balance ? formatAmount(balance.available) : '—'}
          </p>
          {balance && balance.locked > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {formatAmount(balance.locked)} locked in pending transactions
            </p>
          )}
        </div>

        {/* Send money */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Send money
          </h2>

          <form onSubmit={handleSendMoney} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Recipient phone number
              </label>
              <input
                type="text"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="9876543210"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount (₹)
              </label>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="100"
                min="1"
                step="0.01"
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            {sendError && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                {sendError}
              </p>
            )}

            {sendSuccess && (
              <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg">
                {sendSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send money'}
            </button>
          </form>
        </div>

        {/* Transfer history */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Recent transfers
          </h2>

          {transfers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No transfers yet
            </p>
          ) : (
            <div className="space-y-3">
              {transfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {/* Direction indicator */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        transfer.direction === 'sent'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      {transfer.direction === 'sent' ? '↑' : '↓'}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transfer.direction === 'sent' ? 'Sent to' : 'Received from'}{' '}
                        {transfer.counterparty.name ||
                          transfer.counterparty.number}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(transfer.timestamp).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        transfer.direction === 'sent'
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {transfer.direction === 'sent' ? '-' : '+'}
                      {formatAmount(transfer.amount)}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {transfer.status.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}