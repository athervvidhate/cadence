import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import type { DashboardWeightPoint } from '../types';

type TrendChartProps = {
  data?: DashboardWeightPoint[];
  baselineWeight?: number;
};

export function TrendChart({ data, baselineWeight }: TrendChartProps) {
  const chartData =
    data && data.length > 0
      ? data.map((point, index) => ({
          day: `D${index + 1}`,
          weight: point.weightLbs,
        }))
      : [];

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
          {typeof baselineWeight === 'number' && (
            <>
              <ReferenceLine y={baselineWeight + 2} stroke="#c8843a" strokeDasharray="4 5" />
              <ReferenceLine y={baselineWeight + 5} stroke="#b2492b" strokeDasharray="4 5" />
            </>
          )}
          <XAxis dataKey="day" tick={{ fill: '#6b716c', fontSize: 12 }} />
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#6b716c', fontSize: 12 }} />
          <Area type="monotone" dataKey="weight" stroke="#ac4627" fill="#f5ddd4" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
