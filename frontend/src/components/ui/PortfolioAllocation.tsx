import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type Props = {
  stocks: number;
  etfs: number;
  cash: number;
};

export default function PortfolioAllocation({
  stocks,
  etfs,
  cash,
}: Props) {
  const data = [
    { name: 'Stocks', value: stocks, color: '#39e58c' },
    { name: 'ETFs', value: etfs, color: '#6d8cff' },
    { name: 'Cash', value: cash, color: '#8c929c' },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rw-allocation">
      <div className="rw-allocation-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="72%"
              outerRadius="92%"
              paddingAngle={3}
              stroke="none"
              animationDuration={700}
            >
              {data.map(item => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={value =>
                new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                }).format(Number(value))
              }
              contentStyle={{
                background: '#14171c',
                border: '1px solid #30343b',
                borderRadius: 10,
                color: '#f5f5f5',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="rw-allocation-center">
          <span>Portfolio</span>
          <strong>
            {total.toLocaleString('en-CA', {
              style: 'currency',
              currency: 'CAD',
              maximumFractionDigits: 0,
            })}
          </strong>
        </div>
      </div>

      <div className="rw-allocation-legend">
        {data.map(item => (
          <div key={item.name}>
            <span>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
            <strong>{total ? (item.value / total * 100).toFixed(1) : 0}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
