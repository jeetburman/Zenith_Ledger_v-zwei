'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { apiClient } from '../lib/apiClient';

interface DashboardData {
  id: number;
  name: string;
  email: string;
  totalRevenue: number;
  totalTransactions: number;
}

interface MerchantTransaction {
  id: number;
  amount: number;
  status: string;
  reference: string;
  timestamp: string;
  user: {
    id: number;
    name: string | null;
    number: string;
  };
}

export default function MerchantDashboardClient({ session }: { session: any }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, txRes] = await Promise.all([
        apiClient.get<{ status: string; data: DashboardData }>(
          '/api/merchant/dashboard'
        ),
        apiClient.get<{ status: string; data: MerchantTransaction[] }>(
          '/api/merchant/transactions'
        ),
      ]);
      setData(dashRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      console.error('Failed to load merchant dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (paise: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading your store...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Merchant Portal
          </p>
          <h1 className="text-lg font-semibold text-gray-900">
            {data?.name || 'Your Store'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{data?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Revenue summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Total revenue</p>
            <p className="text-4xl font-semibold text-gray-900">
              {data ? formatAmount(data.totalRevenue) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">
              Total transactions
            </p>
            <p className="text-4xl font-semibold text-gray-900">
              {data?.totalTransactions ?? '—'}
            </p>
          </div>
        </div>

        {/* Merchant ID — users need this to pay */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Your merchant ID
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Share this ID with customers so they can pay you from
            their Zenith Ledger wallet.
          </p>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
            <span className="text-2xl font-mono font-bold text-gray-900">
              {data?.id}
            </span>
            <button
              onClick={() =>
                navigator.clipboard.writeText(String(data?.id))
              }
              className="ml-auto text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-2 py-1"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Payment history
          </h2>

          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No payments received yet
            </p>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-sm">
                      ↓
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.user.name || tx.user.number}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.timestamp).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                        {' · '}
                        {tx.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      +{formatAmount(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {tx.status.toLowerCase()}
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