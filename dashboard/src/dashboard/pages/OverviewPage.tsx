import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { PATIENT_ID, STATUS_META } from '../constants';
import type { StatusLevel } from '../types';
import { InfoCard } from '../components/InfoCard';
import { TrendChart } from '../components/TrendChart';
import { useDashboard } from '../useDashboard';

export function OverviewPage() {
  const { status } = useParams();
  const { data, loading, error } = useDashboard();

  const level = normalizeStatus(data?.todayStatus || status || 'green');
  const meta = STATUS_META[level];
  const patientName = data?.patient?.patientName ?? '—';
  const today = data?.weightTrend?.at(-1);
  const yesterday = data?.weightTrend?.at(-2);
  const weightDelta = today && yesterday ? (today.weightLbs - yesterday.weightLbs) : null;

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {patientName.toUpperCase()} / OVERVIEW</div>
        <div className="row gap-2">
          <Link to={`/patients/${PATIENT_ID}/overview/green`} className="dc-btn dc-btn-ghost">Green</Link>
          <Link to={`/patients/${PATIENT_ID}/overview/yellow`} className="dc-btn dc-btn-ghost">Yellow</Link>
          <Link to={`/patients/${PATIENT_ID}/overview/red`} className="dc-btn dc-btn-ghost">Red</Link>
        </div>
      </header>

      <section className="hero">
        <motion.span className={`dc-pill ${meta.tone}`} animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}>
          {meta.label}
        </motion.span>
        <h1>{meta.headline.replace('Dad', data?.patient?.preferredName ?? 'Dad')}</h1>
        <p>{meta.detail}</p>
        <p className="subtle">Day {data?.currentDay ?? '—'} of 30</p>
      </section>

      <section className="stats-grid">
        <InfoCard
          label="Weight today"
          value={today ? `${today.weightLbs} lb` : '—'}
          sub={weightDelta != null ? `${weightDelta >= 0 ? '+' : ''}${weightDelta} lb from yesterday` : 'No prior data'}
        />
        <InfoCard
          label="Adherence · 7d"
          value={data ? `${Math.round(data.adherence7d * 100)}%` : '—'}
          sub=""
        />
        <InfoCard
          label="Breathing"
          value={data?.todaySymptoms?.shortnessOfBreath === 'none' ? 'Clear' : data?.todaySymptoms?.shortnessOfBreath ?? '—'}
          sub=""
        />
        <InfoCard label="Alerts" value={String(data?.alertHistory?.length ?? 0)} sub="total logged" />
      </section>

      <section className="two-col">
        <div className="dc-card chart-card">
          <h3>Weight trend · last 7 days</h3>
          <TrendChart data={data?.weightTrend} />
        </div>
        <div className="dc-card">
          <h3>Medications</h3>
          <ul className="simple-list">
            {data?.regimen?.medications?.length
              ? data.regimen.medications.map((m, i) => (
                  <li key={i}>{m.drugName} · {m.dose} · {m.frequency}</li>
                ))
              : <li>No regimen extracted yet</li>
            }
          </ul>
        </div>
      </section>
    </>
  );
}

function normalizeStatus(status: string): StatusLevel {
  if (status === 'green' || status === 'yellow' || status === 'red') {
    return status;
  }
  return 'red';
}
