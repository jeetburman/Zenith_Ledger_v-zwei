'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RatesData {
  base: string;
  rates: Record<string, number>;
  updatedAt: string;
}

// This hook connects to the Express Socket.io server
// and returns live currency rates.
// The component using this hook automatically gets
// new rates every time the server broadcasts them —
// no polling, no page refresh needed.
export function useCurrencyFeed() {
  const [rates, setRates] = useState<RatesData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to the Express API WebSocket
    const socket: Socket = io(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      {
        // transports: ['websocket'] skips the HTTP long-polling
        // fallback and connects via WebSocket directly.
        // Faster and cleaner for our use case.
        transports: ['websocket'],
      }
    );

    socket.on('connect', () => {
      setConnected(true);
      console.log('Currency feed connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Listen for rate updates broadcast by the poller
    socket.on('rates:update', (data: RatesData) => {
      setRates(data);
    });

    // Cleanup — disconnect when the component unmounts
    // so we don't leak WebSocket connections
    return () => {
      socket.disconnect();
    };
  }, []);

  return { rates, connected };
}