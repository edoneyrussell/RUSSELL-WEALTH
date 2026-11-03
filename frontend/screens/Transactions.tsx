import { useTransactions } from '../useTransactions';

const money = (value: string) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));

export default function Transactions() {
  const { transactions, loading, error } = useTransactions();

  return (
    <div className="min-h-screen bg-[#08090a] px-5 py-10 text-[#f5f5f5] md:px-12">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-8">
          <button
            onClick={() => {
              window.history.pushState({}, '', '/dashboard');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="mb-6 cursor-pointer text-sm text-[#b4b8c0] hover:text-white"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-[30px] font-semibold tracking-tight">
            Transaction History
          </h1>
          <p className="mt-2 text-sm text-[#8c929c]">
            Your simulated investment activity
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-[#30343b] bg-[#14171c]">
          {loading ? (
            <p className="p-8 text-[#b4b8c0]">Loading transactions...</p>
          ) : error ? (
            <p className="p-8 text-[#f09a9a]">
              Unable to load transaction history.
            </p>
          ) : transactions.length === 0 ? (
            <p className="p-8 text-[#b4b8c0]">
              No transactions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[#30343b] text-[#8c929c]">
                  <tr>
                    {['Date', 'Asset', 'Action', 'Shares', 'Price', 'Total'].map(label => (
                      <th key={label} className="px-5 py-4 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr
                      key={transaction.id}
                      className="border-b border-[#30343b] last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-[#b4b8c0]">
                        {transaction.created_at}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{transaction.symbol}</div>
                        <div className="text-xs text-[#8c929c]">{transaction.name}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={
                          transaction.action === 'BUY'
                            ? 'text-[#39e58c]'
                            : 'text-[#f1b46b]'
                        }>
                          {transaction.action}
                        </span>
                      </td>
                      <td className="px-5 py-4">{transaction.quantity}</td>
                      <td className="px-5 py-4">{money(transaction.price)}</td>
                      <td className="px-5 py-4 font-semibold">
                        {money(transaction.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-xs text-[#8c929c]">
          Simulated transactions only. No real money or securities.
        </p>
      </div>
    </div>
  );
}
