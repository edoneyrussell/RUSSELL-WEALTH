type Position = {
  symbol: string;
  name: string;
  quantity: string;
  market_value: string;
};

// Symbol-based colours stay attached to a holding when its value or rank changes.
export function buildPositionAllocation<T extends Position>(holdings: readonly T[]) {
  const colours = new Map<string, string>();
  const used = new Set<number>();
  for (const symbol of [...new Set(holdings.map(h => h.symbol))].sort()) {
    let hash = 2166136261;
    for (const character of symbol) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    }
    let code = hash % (360 * 16 * 14);
    while (used.has(code)) code = (code + 137) % (360 * 16 * 14);
    used.add(code);
    colours.set(symbol, `hsl(${code % 360}, ${65 + Math.floor(code / 360) % 16}%, ${55 + Math.floor(code / 5760)}%)`);
  }
  const positions = holdings.map(holding => ({
    ...holding,
    value: Math.max(0, Number(holding.market_value) || 0),
    color: colours.get(holding.symbol)!,
  }));
  const invested = positions.reduce((sum, position) => sum + position.value, 0);
  return positions.map(position => ({
    ...position,
    weight: invested > 0 ? position.value / invested * 100 : 0,
  })).sort((a, b) => b.value - a.value || a.symbol.localeCompare(b.symbol));
}
