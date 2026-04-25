import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { PATIENT_ID, STATUS_META } from '../constants';
import type { StatusLevel } from '../types';
import { InfoCard } from '../components/InfoCard';
import { TrendChart } from '../components/TrendChart';

export function OverviewPage() {
  const { status = 'red' } = useParams();
  const level = normalizeStatus(status);
  const meta = STATUS_META[level];

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / ROBERT CHEN / OVERVIEW</div>
        <div className="row gap-2">
          <Link to={`/patients/${PATIENT_ID}/overview/green`} className="dc-btn dc-btn-ghost">
            Green
          </Link>
          <Link to={`/patients/${PATIENT_ID}/overview/yellow`} className="dc-btn dc-btn-ghost">
            Yellow
          </Link>
          <Link to={`/patients/${PATIENT_ID}/overview/red`} className="dc-btn dc-btn-ghost">
            Red
          </Link>
        </div>
      </header>

      <section className="hero">
        <motion.span className={`dc-pill ${meta.tone}`} animate={{ scale: [1, 1.03, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}>
          {meta.label}
        </motion.span>
        <h1>{meta.headline}</h1>
        <p>{meta.detail}</p>
        <p className="subtle">Day 4 of 30 · Last check-in 8:04 AM · presentational scripted state</p>
      </section>

      <section className="stats-grid">
        <InfoCard
          label="Weight today"
          value={level === 'red' ? '187 lb' : level === 'yellow' ? '186 lb' : '184 lb'}
          sub={level === 'red' ? '+3 lb in 24h' : level === 'yellow' ? '+2 lb in 24h' : 'At baseline'}
        />
        <InfoCard label="Adherence · 7d" value="94%" sub="2 doses missed" />
        <InfoCard label="Breathing" value={level === 'green' ? 'Clear' : 'Tight'} sub="On exertion" />
        <InfoCard label="Next clinic" value="May 02" sub="Day 7 · cardiology" />
      </section>

      <section className="two-col">
        <div className="dc-card chart-card">
          <h3>Weight trend · last 7 days</h3>
          <TrendChart />
        </div>
        <div className="dc-card">
          <h3>Today summary</h3>
          <ul className="simple-list">
            <li>8:04 AM · Morning check-in complete</li>
            <li>8:14 AM · Furosemide taken</li>
            <li>8:14 AM · Metoprolol taken</li>
            <li>8:00 PM · Evening check-in scheduled</li>
            <li>8:00 PM · Evening meds scheduled</li>
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
