import { Skeleton } from '../experience/Feedback';
import AssetLogo from "./AssetLogo";
import { usePortfolio, formatCAD, type AccountScope } from '../hooks/usePortfolio';

export default function HoldingsList({ limit, scope }: { limit?: number; scope?: AccountScope }) {
  const { portfolio, error } = usePortfolio(scope);

  if (error && !portfolio) {
    return (
      <p className="text-[#b4b8c0] text-[12px] py-4">
        {error}
      </p>
    );
  }

  if (!portfolio) {
    return <Skeleton rows={3}/>;
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
      <div className="rw-holdings-column-labels" aria-hidden="true"><span>Asset</span><span>Shares</span><span>Price</span><span>Value</span></div>
      {[...portfolio.holdings].sort((a, b) => Number(b.market_value) - Number(a.market_value)).slice(0, limit).map(holding => (
        <div
          key={holding.symbol}
          className="rw-dashboard-stock rw-dashboard-holding border-b border-[#30343b] py-3 flex items-center gap-3"
        >
          <div className="rw-holding-identity flex-1 min-w-0">
            <div className="flex min-w-0 items-center gap-3"><AssetLogo symbol={holding.symbol} name={holding.name} /><div className="min-w-0"><p className="text-[#f5f5f5] font-semibold text-[12px]">
              {holding.symbol}
            </p>
            <p className="text-[#8c929c] text-[10px] truncate">
              {holding.name}
            </p></div></div>
          </div>

          <div className="rw-holding-detail text-right w-[70px]">
              <span className="rw-holding-label hidden text-[#8c929c] text-[11px]">
                Shares
              </span>
            <p className="text-[#f5f5f5] text-[12px]">
              {holding.quantity}
            </p>
          </div>

          <div className="rw-holding-detail text-right w-[80px]">
              <span className="rw-holding-label hidden text-[#8c929c] text-[11px]">
                Price
              </span>
            <p className="text-[#b4b8c0] text-[12px]">
              {formatCAD(holding.price)}
            </p>
          </div>

          <div className="rw-holding-detail text-right w-[90px]">
              <span className="rw-holding-label hidden text-[#8c929c] text-[11px]">
                Market Value
              </span>
            <p className="text-[#f5f5f5] font-medium text-[12px]">
              {formatCAD(holding.market_value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
