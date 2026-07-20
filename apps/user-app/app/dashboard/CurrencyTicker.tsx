'use client';

import { useCurrencyFeed } from '../../hooks/useCurrencyFeed';

// Currency flags for display
const CURRENCY_FLAGS: Record<string, string> = {
  INR: '🇮🇳',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  CAD: '🇨🇦',
  AUD: '🇦🇺',
};

export default function CurrencyTicker() {
  const { rates, connected } = useCurrencyFeed();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">
          Live exchange rates
        </h2>
        {/* Live indicator dot */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
          <span className="text-xs text-gray-400">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      {!rates ? (
        <div className="space-y-3">
          {/* Skeleton loading state */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {Object.entries(rates.rates).map(([currency, rate]) => (
              <div
                key={currency}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">
                    {CURRENCY_FLAGS[currency] || '🌐'}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {currency}
                    </span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      per 1 {rates.base}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {rate.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Updated{' '}
            {new Date(rates.updatedAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
            {' · '}Source: Frankfurter / ECB
          </p>
        </>
      )}
    </div>
  );
}