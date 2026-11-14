import test from 'node:test';
import assert from 'node:assert/strict';
import { readWatchlistQuote, watchlistMoney } from '../src/utils/watchlistQuote.ts';

const base = {symbol:'AAPL',price:125,currency:'CAD',previous_close:100,reference_date:'2026-11-12'};
test('daily movement uses the exact displayed price and previous price', () => {
  const up = readWatchlistQuote(base, 'AAPL');
  assert.equal(up.quote?.price, 125);
  assert.equal(up.change, 25);
  assert.equal(up.percent, 25);
  const down = readWatchlistQuote({...base,price:75}, 'AAPL');
  assert.equal(down.change, -25);
  assert.equal(down.percent, -25);
  assert.equal(readWatchlistQuote({...base,price:100}, 'AAPL').change, 0);
  assert.equal(readWatchlistQuote({...base,price:100.01}, 'AAPL').change, 0.01);
});
test('missing reference data never invents zero movement', () => {
  assert.equal(readWatchlistQuote({...base,previous_close:null}, 'AAPL').change, undefined);
  assert.equal(readWatchlistQuote({...base,previous_close:0}, 'AAPL').percent, undefined);
  assert.equal(readWatchlistQuote({...base,reference_date:undefined}, 'AAPL').change, undefined);
});
test('rejects invalid quotes and quotes for another saved asset', () => {
  for (const value of [null,{...base,price:NaN},{...base,price:null},{...base,price:-1},{...base,currency:'invalid'}]) {
    assert.throws(() => readWatchlistQuote(value, 'AAPL'));
  }
  assert.throws(() => readWatchlistQuote(base, 'MSFT'));
  assert.equal(watchlistMoney(1234.5, 'CAD'), '$1,234.50');
});
