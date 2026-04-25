import type { CSSProperties } from 'react';
import { IconChevron, IconCheck } from '../components/Icons';

type Med = {
  n: string; d: string; f: string; sched: string;
  class: string; ind: string; adh: number; last: string;
  tone: 'good' | 'warn';
  warn?: string;
};

const MEDS: Med[] = [
  { n: 'Furosemide', d: '40 mg', f: '2× daily', sched: '8:00 AM · 8:00 PM', class: 'Loop diuretic', ind: 'Reduces fluid overload', adh: 96, last: '8:14 AM today', tone: 'good' },
  { n: 'Metoprolol succinate', d: '25 mg', f: 'Daily', sched: '8:00 AM', class: 'Beta-blocker', ind: 'Slows heart rate, lowers BP', adh: 100, last: '8:14 AM today', tone: 'good', warn: 'Bottle says 50 mg — pharmacy review pending' },
  { n: 'Lisinopril', d: '10 mg', f: 'Daily', sched: '8:00 AM', class: 'ACE inhibitor', ind: 'Lowers BP, protects heart', adh: 100, last: '8:14 AM today', tone: 'good' },
  { n: 'Spironolactone', d: '25 mg', f: 'Daily', sched: '8:00 AM', class: 'K-sparing diuretic', ind: 'Aldosterone antagonist', adh: 100, last: '8:14 AM today', tone: 'good' },
  { n: 'Potassium chloride', d: '20 mEq', f: 'Daily', sched: '8:00 AM', class: 'Electrolyte', ind: 'Replaces potassium lost to diuretic', adh: 86, last: '8:14 AM today', tone: 'warn' },
  { n: 'Atorvastatin', d: '40 mg', f: 'Daily', sched: '9:00 PM', class: 'Statin', ind: 'Lowers cholesterol', adh: 100, last: 'Yesterday 9:08 PM', tone: 'good' },
  { n: 'Aspirin', d: '81 mg', f: 'Daily', sched: '8:00 AM', class: 'Antiplatelet', ind: 'Prevents clots', adh: 100, last: '8:14 AM today', tone: 'good' },
  { n: 'Pantoprazole', d: '40 mg', f: 'Daily', sched: '7:30 AM', class: 'PPI', ind: 'Stomach protection', adh: 92, last: '7:38 AM today', tone: 'good' },
];

const SCHEDULE_SLOTS = [
  { t: '7:30 AM', meds: ['Pantoprazole'], status: 'taken' as const },
  { t: '8:00 AM', meds: ['Furosemide', 'Metoprolol', 'Lisinopril', 'Spironolactone', 'Potassium', 'Aspirin'], status: 'taken' as const },
  { t: '8:00 PM', meds: ['Furosemide'], status: 'upcoming' as const },
  { t: '9:00 PM', meds: ['Atorvastatin'], status: 'upcoming' as const },
];

export function MedicationsPage() {
  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / ROBERT CHEN / MEDICATIONS</div>
        <div className="row gap-2">
          <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Print regimen</button>
          <button className="dc-btn dc-btn-primary" style={{ fontSize: 13 }}>+ Add medication</button>
        </div>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>8 active · 1 review pending</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Daily regimen
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Reconciled against the discharge paperwork and the dispensed bottles. Adherence is tracked by voice confirmation each dose.
        </p>
      </div>

      {/* Schedule rail */}
      <div className="dc-card" style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="dc-h-eyebrow">Today's schedule</div>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Tap a slot for details</span>
        </div>
        <div style={{ position: 'relative', marginTop: 18, height: 60 }}>
          <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 2, background: 'var(--hairline)' }} />
          {SCHEDULE_SLOTS.map((slot, i) => {
            const left = (i / (SCHEDULE_SLOTS.length - 1)) * 92 + 4;
            const taken = slot.status === 'taken';
            return (
              <div key={i} style={{ position: 'absolute', left: `${left}%`, transform: 'translateX(-50%)', top: 0, width: 130, textAlign: 'center' }}>
                <div className="text-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{slot.t}</div>
                <div style={{
                  width: 22, height: 22, borderRadius: 11, margin: '6px auto 0',
                  background: taken ? 'var(--accent)' : 'var(--surface)',
                  border: taken ? 'none' : '2px dashed var(--hairline)',
                  display: 'grid', placeItems: 'center',
                }}>
                  {taken && <IconCheck size={12} style={{ color: '#fff' }} />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4 }}>
                  {slot.meds.length} med{slot.meds.length > 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Medication table */}
      <div className="dc-card" style={{ padding: 0 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.6fr 1fr 60px',
          padding: '12px 18px', borderBottom: '1px solid var(--hairline)',
          fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>Drug</span><span>Schedule</span><span>Indication</span><span>7-day adherence</span><span />
        </div>
        {MEDS.map((m, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.6fr 1fr 60px',
            padding: '14px 18px', alignItems: 'center',
            borderBottom: i < MEDS.length - 1 ? '1px solid var(--hairline)' : 'none',
          }}>
            <div className="col" style={{ gap: 2 }}>
              <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{m.n}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{m.d}</span>
                {m.warn && <span className="dc-pill yellow"><div className="dot" />review</span>}
              </div>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.class}</span>
              {m.warn && <span style={{ fontSize: 12, color: 'var(--warn-ink)', marginTop: 2 }}>⚠ {m.warn}</span>}
            </div>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 13 }}>{m.f}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{m.sched}</span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{m.ind}</span>
              <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Last: {m.last}</span>
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: m.tone === 'warn' ? 'var(--warn-ink)' : 'var(--accent-ink)' }}>{m.adh}%</span>
              <div style={{ width: '100%', height: 4, background: 'var(--hairline-2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${m.adh}%`, height: '100%', background: m.tone === 'warn' ? 'var(--warn)' : 'var(--accent)' }} />
              </div>
            </div>
            <IconChevron size={14} style={{ color: 'var(--ink-3)', justifySelf: 'end' } as CSSProperties} />
          </div>
        ))}
      </div>

      {/* Interactions + Refills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Interactions monitored</div>
          <div className="col" style={{ marginTop: 10 }}>
            {[
              { d: 'Furosemide + Lisinopril', s: 'moderate', n: 'Monitor potassium · risk of hypotension' },
              { d: 'Spironolactone + Potassium Cl', s: 'moderate', n: 'Risk of hyperkalemia · check labs at Day 7' },
              { d: 'Atorvastatin + grapefruit', s: 'moderate', n: 'Avoid grapefruit juice in patient instructions' },
            ].map((it, i, arr) => (
              <div key={i} className="row" style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none', justifyContent: 'space-between', gap: 10 }}>
                <div className="col" style={{ gap: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{it.d}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.n}</span>
                </div>
                <span className="dc-pill yellow"><div className="dot" />{it.s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Refills</div>
          <div className="col" style={{ marginTop: 10 }}>
            {[
              { n: 'Furosemide', d: '14 days left', tone: 'warn' as const },
              { n: 'Lisinopril', d: '24 days left', tone: 'good' as const },
              { n: 'Potassium Cl', d: '8 days left', tone: 'danger' as const },
              { n: 'Atorvastatin', d: '30+ days', tone: 'good' as const },
            ].map((it, i, arr) => (
              <div key={i} className="row" style={{ padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{it.n}</span>
                <div className="row gap-2">
                  <span style={{ fontSize: 12.5, color: it.tone === 'danger' ? 'var(--danger-ink)' : it.tone === 'warn' ? 'var(--warn-ink)' : 'var(--ink-3)' }}>{it.d}</span>
                  {it.tone !== 'good' && <span className="dc-tag" style={{ background: 'var(--ink)', color: 'var(--bg-elev)' }}>refill</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
