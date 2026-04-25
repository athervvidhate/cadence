import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { CHART_DATA } from '../constants';

export function TrendChart() {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={CHART_DATA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
          <ReferenceLine y={186} stroke="#c8843a" strokeDasharray="4 5" />
          <ReferenceLine y={189} stroke="#b2492b" strokeDasharray="4 5" />
          <XAxis dataKey="day" tick={{ fill: '#6b716c', fontSize: 12 }} />
          <YAxis domain={[180, 190]} tick={{ fill: '#6b716c', fontSize: 12 }} />
          <Area type="monotone" dataKey="weight" stroke="#ac4627" fill="#f5ddd4" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
