import { useState } from 'react';

type TradeDirection = 'BUY' | 'SELL';

export function useTrading() {
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [symbol, setSymbol] = useState('VDY');
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submitTrade() {
    setMessage('');
    setError('');

    if (!/^[1-9]\d*$/.test(quantity) || Number(quantity) > 1000000) {
      setError('Enter a valid whole-share quantity.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/customer/trade', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: direction,
          symbol,
          quantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Trade failed');
      }

      setMessage(
        `${direction === 'BUY' ? 'Bought' : 'Sold'} ${quantity} ${symbol} shares successfully.`
      );

      window.dispatchEvent(new Event('portfolio-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  }

  return {
    direction,
    setDirection,
    symbol,
    setSymbol,
    quantity,
    setQuantity,
    submitting,
    message,
    error,
    submitTrade,
  };
}
