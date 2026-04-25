import { TrendChart } from '../components/TrendChart';
import { useDashboardData } from '../DashboardDataContext';
import { formatDate, formatPercent, formatWeight } from '../formatters';

export function TrendsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {data?.patient.patientName.toUpperCase() ?? 'LOADING'} / TRENDS</div>
        <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Export CSV</button>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>
          Day {data?.currentDay ?? '...'} of 30
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Patient trends
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Weight, adherence, and symptom patterns from daily check-ins.
        </p>
      </div>

      {isLoading && <section className="dc-card">Loading trends...</section>}
      {error && <section className="dc-card">Could not load trends: {error.message}</section>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <section className="dc-card chart-card">
          <h3>Weight trend</h3>
          <TrendChart data={data?.weightTrend} baselineWeight={data?.patient.baselineWeightLbs} />
        </section>

        <section className="dc-card">
          <div className="dc-h-eyebrow">Current summary</div>
          <ul className="simple-list" style={{ marginTop: 10 }}>
            <li>Adherence: {data ? formatPercent(data.adherence7d) : '...'}</li>
            <li>Breathing: {data?.todaySymptoms?.shortnessOfBreath ?? 'not logged'}</li>
            <li>Swelling: {data?.todaySymptoms?.swelling ?? 'not logged'}</li>
            <li>Chest pain: {data?.todaySymptoms?.chestPain ?? 'not logged'}</li>
            <li>Fatigue: {data?.todaySymptoms?.fatigue ?? 'not logged'}</li>
          </ul>
        </section>
      </div>

      <section className="dc-card">
        <div className="dc-h-eyebrow">Weight log</div>
        <ul className="simple-list" style={{ marginTop: 10 }}>
          {data?.weightTrend.map((point) => (
            <li key={`${point.date}-${point.weightLbs}`}>
              {formatDate(point.date)} · {formatWeight(point.weightLbs)}
            </li>
          ))}
          {data && data.weightTrend.length === 0 && <li>No weight readings logged yet.</li>}
        </ul>
      </section>
    </>
  );
}
