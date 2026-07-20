'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';

// All valid expense categories — must match the Prisma enum
const CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
] as const;

type Category = (typeof CATEGORIES)[number];

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: Category;
  date: string;
  note?: string;
}

interface CategorySummary {
  category: Category;
  spent: number;
  count: number;
  percentage: number;
}

interface Summary {
  totalSpent: number;
  totalTransactions: number;
  biggestCategory: CategorySummary | null;
  categories: CategorySummary[];
}

// Emoji per category for visual clarity
const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Bills: '📄',
  Shopping: '🛍️',
  Health: '💊',
  Entertainment: '🎬',
  Other: '📦',
};

// Colour per category for the progress bars
const CATEGORY_COLOR: Record<string, string> = {
  Food: 'bg-orange-400',
  Transport: 'bg-blue-400',
  Bills: 'bg-red-400',
  Shopping: 'bg-pink-400',
  Health: 'bg-green-400',
  Entertainment: 'bg-purple-400',
  Other: 'bg-gray-400',
};

export default function ExpensesClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Add expense form
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food' as Category,
    note: '',
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeCategory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const categoryParam = activeCategory
        ? `?category=${activeCategory}`
        : '';

      const [expensesRes, summaryRes] = await Promise.all([
        apiClient.get<{ status: string; data: Expense[] }>(
          `/api/expenses${categoryParam}`
        ),
        apiClient.get<{ status: string; data: Summary }>(
          '/api/expenses/summary'
        ),
      ]);

      setExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);

    try {
      // Convert rupees to paise
      const amountInPaise = Math.round(parseFloat(form.amount) * 100);

      await apiClient.post('/api/expenses', {
        title: form.title,
        amount: amountInPaise,
        category: form.category,
        note: form.note || undefined,
      });

      // Reset form and refresh
      setForm({ title: '', amount: '', category: 'Food', note: '' });
      fetchData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add expense');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/expenses/${id}`);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete expense:', err.message);
    }
  };

  const formatAmount = (paise: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          <a>
            ← Dashboard
          </a>
          <h1 className="text-lg font-semibold text-gray-900">
            Expenses
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Total spent</p>
              <p className="text-3xl font-semibold text-gray-900">
                {formatAmount(summary.totalSpent)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {summary.totalTransactions} transactions
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">
                Biggest category
              </p>
              {summary.biggestCategory ? (
                <>
                  <p className="text-3xl font-semibold text-gray-900">
                    {CATEGORY_EMOJI[summary.biggestCategory.category]}{' '}
                    {summary.biggestCategory.category}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatAmount(summary.biggestCategory.spent)} —{' '}
                    {summary.biggestCategory.percentage}% of total
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-sm mt-2">
                  No expenses yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Category breakdown */}
        {summary && summary.categories.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              Spending breakdown
            </h2>
            <div className="space-y-4">
              {summary.categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_EMOJI[cat.category]}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {cat.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({cat.count} items)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatAmount(cat.spent)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${CATEGORY_COLOR[cat.category] || 'bg-gray-400'}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add expense form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            Log an expense
          </h2>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Lunch at cafe"
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
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                  placeholder="250"
                  min="1"
                  step="0.01"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      category: e.target.value as Category,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_EMOJI[cat]} {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Note{' '}
                  <span className="text-gray-400 font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, note: e.target.value }))
                  }
                  placeholder="With colleagues"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {addError && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                {addError}
              </p>
            )}

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Adding...' : 'Add expense'}
            </button>
          </form>
        </div>

        {/* Expense list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              All expenses
            </h2>

            {/* Category filter */}
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_EMOJI[cat]} {cat}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-3 animate-pulse"
                >
                  <div className="h-4 bg-gray-100 rounded w-40" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No expenses yet
              {activeCategory && ` in ${activeCategory}`}
            </p>
          ) : (
            <div className="space-y-1">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {CATEGORY_EMOJI[expense.category]}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {expense.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {expense.category} ·{' '}
                        {new Date(expense.date).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                        {expense.note && ` · ${expense.note}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatAmount(expense.amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                      title="Delete expense"
                    >
                      ×
                    </button>
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