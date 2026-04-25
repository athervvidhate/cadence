import { TrendChart } from '../components/TrendChart';
import { useDashboardData } from '../DashboardDataContext';
import { formatDate, formatWeight } from '../formatters';

export function TrendsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <section className="dc-card chart-card">
      <h2>Weight and adherence trends</h2>
      {isLoading && <p>Loading trends...</p>}
      {error && <p>Could not load trends: {error.message}</p>}
      <TrendChart data={data?.weightTrend} baselineWeight={data?.patient.baselineWeightLbs} />
      <ul className="simple-list">
        {data?.weightTrend.map((point) => (
          <li key={point.date}>
            {formatDate(point.date)} · {formatWeight(point.weightLbs)}
          </li>
        ))}
        {data && data.weightTrend.length === 0 && <li>No weight readings logged yet.</li>}
      </ul>
    </section>
  );
}
