import { usePortfolio, formatCAD } from './usePortfolio';

export default function HoldingsList({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  const { portfolio, error } = usePortfolio();

  if (error) {
    return (
      <p className="text-[#b4b8c0] text-[12px] py-4">
        Unable to load holdings.
      </p>
    );
  }

  if (!portfolio) {
    return (
      <p className="text-[#b4b8c0] text-[12px] py-4">
        Loading holdings...
      </p>
    );
  }

  if (portfolio.holdings.length === 0) {
    return (
      <p className="text-[#b4b8c0] text-[12px] py-4">
        No investments yet. Use the trade ticket to buy shares.
      </p>
    );
  }

  return (
    <div className="w-full">
      {portfolio.holdings.map(holding => (
        <div
          key={holding.symbol}
          className={`border-b border-[#30343b] py-3 ${
            mobile ? 'flex flex-col gap-2' : 'flex items-center gap-3'
          }`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[#f5f5f5] font-semibold text-[12px]">
              {holding.symbol}
            </p>
            <p className="text-[#8c929c] text-[10px] truncate">
              {holding.name}
            </p>
          </div>

          <div className={mobile ? 'flex justify-between' : 'text-right w-[70px]'}>
            {mobile && (
              <span className="text-[#8c929c] text-[11px]">
                Shares
              </span>
            )}
            <p className="text-[#f5f5f5] text-[12px]">
              {holding.quantity}
            </p>
          </div>

          <div className={mobile ? 'flex justify-between' : 'text-right w-[80px]'}>
            {mobile && (
              <span className="text-[#8c929c] text-[11px]">
                Price
              </span>
            )}
            <p className="text-[#b4b8c0] text-[12px]">
              {formatCAD(holding.price)}
            </p>
          </div>

          <div className={mobile ? 'flex justify-between' : 'text-right w-[90px]'}>
            {mobile && (
              <span className="text-[#8c929c] text-[11px]">
                Market Value
              </span>
            )}
            <p className="text-[#f5f5f5] font-medium text-[12px]">
              {formatCAD(holding.market_value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
