import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PATIENT_ID } from '../constants';
import { useDashboard } from '../useDashboard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface DailyLog {
  _id: string;
  dayNumber: number;
  date: string;
  weightLbs: number;
  weightDeltaFromBaseline: number;
  flagLevel: 'green' | 'yellow' | 'red' | 'urgent';
  flagReasons: string[];
  symptoms: {
    shortnessOfBreath: string;
    swelling: string;
    chestPain: string;
    fatigue: string;
  };
  medsTaken: { drugName: string; taken: boolean }[];
}

const STATUS_META = {
  green: { label: 'Stable', bg: '#d4edda', color: '#2d6a4f' },
  yellow: { label: 'Watch', bg: '#fff3cd', color: '#856404' },
  red: { label: 'Action needed', bg: '#f8d7da', color: '#842029' },
  urgent: { label: 'Urgent', bg: '#f5c6cb', color: '#491217' },
};

export function TimeWarpPage() {
  const { id = PATIENT_ID } = useParams();
  const { data: dashData } = useDashboard();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/patients/${id}/daily-logs`)
      .then(r => r.json())
      .then((data: DailyLog[]) => {
        setLogs(data);
        if (data.length > 0) setSelectedDay(data[0].dayNumber);
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setSelectedDay(d => {
          const max = logs[logs.length - 1]?.dayNumber ?? d;
          if (d >= max) { setPlaying(false); return d; }
          return d + 1;
        });
      }, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, logs]);

  const log = logs.find(l => l.dayNumber === selectedDay);
  const meta = log ? STATUS_META[log.flagLevel] ?? STATUS_META.green : null;
  const maxDay = logs[logs.length - 1]?.dayNumber ?? 1;
  const adherence = log
    ? Math.round((log.medsTaken.filter(m => m.taken).length / Math.max(log.medsTaken.length, 1)) * 100)
    : null;

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {(dashData?.patient?.patientName ?? '—').toUpperCase()} / TIME-WARP</div>
      </header>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <h3>Scrub through the monitoring period</h3>
        <p className="subtle" style={{ marginTop: 4, marginBottom: 20 }}>
          {logs.length} days recorded · drag the slider or press Play to auto-advance
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span className="subtle" style={{ fontSize: 12, width: 40 }}>Day 1</span>
          <input
            type="range"
            min={logs[0]?.dayNumber ?? 1}
            max={maxDay}
            value={selectedDay}
            onChange={e => { setPlaying(false); setSelectedDay(Number(e.target.value)); }}
            style={{ flex: 1, accentColor: '#ac4627' }}
          />
          <span className="subtle" style={{ fontSize: 12, width: 40, textAlign: 'right' }}>Day {maxDay}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className="dc-btn dc-btn-primary"
            onClick={() => {
              if (selectedDay >= maxDay) setSelectedDay(logs[0]?.dayNumber ?? 1);
              setPlaying(p => !p);
            }}
          >
            {playing ? 'Pause' : selectedDay >= maxDay ? 'Replay' : 'Play'}
          </button>
          <button
            className="dc-btn dc-btn-ghost"
            onClick={() => { setPlaying(false); setSelectedDay(logs[0]?.dayNumber ?? 1); }}
          >
            Reset
          </button>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {log && meta ? (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="dc-card" style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}>
                <div className="subtle" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 6 }}>Day {log.dayNumber} Status</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: meta.color }}>{meta.label}</div>
                {log.flagReasons.length > 0 && (
                  <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
                    {log.flagReasons.map((r, i) => (
                      <li key={i} style={{ fontSize: 12, color: meta.color, marginTop: 3 }}>· {r}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="dc-card">
                <div className="subtle" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 6 }}>Weight</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{log.weightLbs} lb</div>
                <div className="subtle" style={{ fontSize: 13, marginTop: 4 }}>
                  {log.weightDeltaFromBaseline >= 0 ? '+' : ''}{log.weightDeltaFromBaseline?.toFixed(1)} lb from baseline
                </div>
              </div>

              <div className="dc-card">
                <div className="subtle" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>Symptoms</div>
                {[
                  ['Breathing', log.symptoms.shortnessOfBreath],
                  ['Swelling', log.symptoms.swelling],
                  ['Chest pain', log.symptoms.chestPain],
                  ['Fatigue', log.symptoms.fatigue],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span className="subtle">{label}</span>
                    <span style={{ fontWeight: val === 'none' ? 400 : 600, color: val === 'none' ? '#6b716c' : '#ac4627' }}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              <div className="dc-card">
                <div className="subtle" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>Medications</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: adherence != null && adherence >= 90 ? '#2d6a4f' : '#ac4627' }}>
                  {adherence ?? '—'}%
                </div>
                <div className="subtle" style={{ fontSize: 13, marginTop: 4 }}>of doses taken today</div>
                {log.medsTaken.filter(m => !m.taken).length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#ac4627' }}>
                    Missed: {log.medsTaken.filter(m => !m.taken).map(m => m.drugName).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="dc-card"><p className="subtle">No data recorded for this day.</p></div>
        )}
      </AnimatePresence>
    </>
  );
}
