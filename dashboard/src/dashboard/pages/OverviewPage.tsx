import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { STATUS_META } from '../constants';
import { useDashboardData } from '../DashboardDataContext';
import { displayPreferredName, displayStatus, formatPercent, formatWeight } from '../formatters';
import type { StatusLevel } from '../types';
import { InfoCard } from '../components/InfoCard';
import { TrendChart } from '../components/TrendChart';

export function OverviewPage() {
  const { id, status } = useParams();
  const { data, error, isLoading } = useDashboardData();
  const level = normalizeStatus(status ?? data?.todayStatus ?? 'green');
  const meta = STATUS_META[level];
  const patientName = data?.patient.patientName ?? 'Patient';
  const preferredName = displayPreferredName(data);
  const latestWeight = data?.weightTrend.at(-1)?.weightLbs;
  const previousWeight = data && data.weightTrend.length > 1 ? data.weightTrend.at(-2)?.weightLbs : undefined;
  const weightDelta =
    typeof latestWeight === 'number' && typeof previousWeight === 'number'
      ? latestWeight - previousWeight
      : undefined;
  const breathing = data?.todaySymptoms?.shortnessOfBreath ?? 'not logged';

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {patientName.toUpperCase()} / OVERVIEW</div>
        <div className="row gap-2">
          <Link to={`/patients/${id}/overview/green`} className="dc-btn dc-btn-ghost">
            Green
          </Link>
          <Link to={`/patients/${id}/overview/yellow`} className="dc-btn dc-btn-ghost">
            Yellow
          </Link>
          <Link to={`/patients/${id}/overview/red`} className="dc-btn dc-btn-ghost">
            Red
          </Link>
        </div>
      </header>

      {isLoading && <section className="dc-card">Loading patient dashboard...</section>}
      {error && <section className="dc-card">Could not load patient dashboard: {error.message}</section>}

      <section className="hero">
        <motion.span className={`dc-pill ${meta.tone}`} animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}>
          {meta.label}
        </motion.span>
        <h1>{meta.headline(preferredName)}</h1>
        <p>{meta.detail}</p>
        <p className="subtle">
          Day {data?.currentDay ?? '...'} of 30 · Status from latest check-in · live API data
        </p>
      </section>

      <section className="stats-grid">
        <InfoCard
          label="Weight today"
          value={formatWeight(latestWeight)}
          sub={typeof weightDelta === 'number' ? `${weightDelta >= 0 ? '+' : ''}${weightDelta} lb since last log` : 'No prior log'}
        />
        <InfoCard label="Adherence · 7d" value={data ? formatPercent(data.adherence7d) : '...'} sub="From medication logs" />
        <InfoCard label="Breathing" value={breathing} sub="Latest patient response" />
        <InfoCard label="Caregiver voice" value={data?.patient.caregiver.voiceId ? 'Ready' : 'Not set'} sub={data?.patient.caregiver.name ?? 'Caregiver'} />
      </section>

      <section className="two-col">
        <div className="dc-card chart-card">
          <h3>Weight trend · last 7 days</h3>
          <TrendChart data={data?.weightTrend} baselineWeight={data?.patient.baselineWeightLbs} />
        </div>
        <div className="dc-card">
          <h3>Today summary</h3>
          <ul className="simple-list">
            <li>Current status: {data?.todayStatus ?? 'loading'}</li>
            <li>Alerts: {data?.alertHistory.length ?? 0}</li>
            <li>Active medications: {data?.regimen.medications.length ?? 0}</li>
            <li>Language: {data?.patient.language ?? '...'}</li>
            <li>Diagnosis: {data?.patient.diagnosis ?? '...'}</li>
          </ul>
        </div>
      </section>
    </>
  );
}

function normalizeStatus(status: string): StatusLevel {
  const display = displayStatus(status as StatusLevel | 'urgent');
  if (display === 'green' || display === 'yellow' || display === 'red') {
    return display;
  }
  return 'green';
}
