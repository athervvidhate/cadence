import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useDashboard } from '../useDashboard';

export function TrendsPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;

  const weightData = (data?.weightTrend ?? []).map(d => ({
    day: d.date.slice(5),
    weight: d.weightLbs,
  }));

  const baseline = data?.patient?.baselineWeightLbs;
  const adherence = data ? Math.round(data.adherence7d * 100) : null;

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {(data?.patient?.patientName ?? '—').toUpperCase()} / TRENDS</div>
      </header>

      <div className="dc-card chart-card" style={{ marginBottom: 24 }}>
        <h3>Weight · all recorded days</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
            {baseline && <ReferenceLine y={baseline} stroke="#6b716c" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#6b716c', fontSize: 11 }} />}
            <ReferenceLine y={(baseline ?? 160) + 2} stroke="#c8843a" strokeDasharray="4 4" />
            <ReferenceLine y={(baseline ?? 160) + 5} stroke="#b2492b" strokeDasharray="4 4" />
            <XAxis dataKey="day" tick={{ fill: '#6b716c', fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#6b716c', fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`${v} lb`, 'Weight']} />
            <Area type="monotone" dataKey="weight" stroke="#ac4627" fill="#f5ddd4" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="subtle" style={{ marginTop: 8 }}>
          Dashed lines: +2 lb (yellow threshold) · +5 lb (red threshold) from baseline
        </p>
      </div>

      <div className="dc-card">
        <h3>Medication adherence · last 7 days</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '16px 0' }}>
          <span style={{ fontSize: 48, fontWeight: 700, color: adherence != null && adherence >= 90 ? '#2d6a4f' : '#ac4627' }}>
            {adherence != null ? `${adherence}%` : '—'}
          </span>
          <span className="subtle">of scheduled doses taken</span>
        </div>
        <div style={{ background: '#f5f0e8', borderRadius: 8, height: 12, overflow: 'hidden' }}>
          <div style={{ background: adherence != null && adherence >= 90 ? '#52b788' : '#ac4627', width: `${adherence ?? 0}%`, height: '100%', borderRadius: 8, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    </>
  );
}
