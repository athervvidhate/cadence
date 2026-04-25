import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PATIENT_ID } from '../constants';
import { IconCheck } from '../components/Icons';

type AlertTone = 'red' | 'yellow' | 'green';
type AlertState = 'open' | 'resolved' | 'info';

type AlertItem = {
  id?: string;
  time: string;
  tone: AlertTone;
  title: string;
  desc: string;
  actions: string[];
  state: AlertState;
};

type AlertGroup = { day: string; items: AlertItem[] };

const GROUPS: AlertGroup[] = [
  {
    day: 'Today · Apr 25',
    items: [
      { id: 'day4', time: '9:04 AM', tone: 'red', title: 'Red flag · weight + new SOB on exertion', desc: 'Day 4. +3 lb in 24h plus new shortness of breath walking to the kitchen. Pattern matches early CHF decompensation.', actions: ['SMS sent to Sarah', 'Cardiology offered'], state: 'open' },
      { time: '8:04 AM', tone: 'yellow', title: 'Weight gain 3 lb in 24h', desc: 'Threshold: > 2 lb / 24 h. Logged from morning weigh-in.', actions: ['Watch'], state: 'open' },
    ],
  },
  {
    day: 'Yesterday · Apr 24',
    items: [
      { time: '11:42 PM', tone: 'yellow', title: 'Late evening dose · Furosemide', desc: '1 hour 42 minutes past scheduled time. Patient confirmed taken.', actions: ['Resolved automatically'], state: 'resolved' },
    ],
  },
  {
    day: 'Day 2 · Apr 23',
    items: [
      { time: '9:42 PM', tone: 'yellow', title: 'Missed evening Furosemide', desc: 'Patient took missed dose at 9:42 PM after second voice prompt.', actions: ['Resolved'], state: 'resolved' },
      { time: '8:30 AM', tone: 'green', title: 'First check-in complete', desc: 'Weight 184 lb · breathing clear · all morning meds taken.', actions: [], state: 'info' },
    ],
  },
];

const FILTERS = ['All', 'Open', 'Red', 'Yellow', 'Resolved'] as const;

const borderColor: Record<AlertTone, string> = {
  red:    'var(--danger)',
  yellow: 'var(--warn)',
  green:  'var(--accent)',
};

export function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState<string>('Open');

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / ROBERT CHEN / ALERTS</div>
        <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Notification settings</button>
      </header>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>2 open · 4 resolved this week</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
            <em style={{ fontStyle: 'italic' }}>2 things</em> need your attention.
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
            Sorted newest first. Yellow flags watch for patterns; red flags trigger SMS and a same-day clinic offer.
          </p>
        </div>
        <div className="row gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, padding: 4, flexShrink: 0 }}>
          {FILTERS.map(s => (
            <button key={s} onClick={() => setActiveFilter(s)} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12.5, border: 'none', cursor: 'pointer',
              background: activeFilter === s ? 'var(--ink)' : 'transparent',
              color:      activeFilter === s ? 'var(--bg)'  : 'var(--ink-2)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { l: 'Open red flags',   v: '1', tone: 'danger' },
          { l: 'Open yellow flags', v: '1', tone: 'warn'   },
          { l: 'Resolved · 30 d',  v: '4', tone: 'good'   },
          { l: 'Avg time to ack',  v: '11 min', tone: ''   },
        ].map((s, i) => (
          <div key={i} className="dc-card" style={{ padding: 14 }}>
            <div className="dc-h-eyebrow">{s.l}</div>
            <div className="text-serif" style={{
              fontSize: 28, marginTop: 4,
              color: s.tone === 'danger' ? 'var(--danger-ink)' : s.tone === 'warn' ? 'var(--warn-ink)' : s.tone === 'good' ? 'var(--accent-ink)' : 'var(--ink)',
            }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Alert groups */}
      <div className="col gap-4">
        {GROUPS.map((g, gi) => (
          <div key={gi}>
            <div className="row" style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="dc-h-eyebrow">{g.day}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            </div>
            <div className="col gap-2">
              {g.items.map((a, i) => (
                <div key={i} className="dc-card" style={{ padding: 16, borderLeft: `3px solid ${borderColor[a.tone]}` }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                    <div className="col flex-1" style={{ gap: 4 }}>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className={`dc-pill ${a.tone}`}>
                          <div className="dot" />
                          {a.tone === 'red' ? 'Red flag' : a.tone === 'yellow' ? 'Yellow' : 'Info'}
                        </span>
                        {a.state === 'resolved' && <span className="dc-tag">resolved</span>}
                        <span className="text-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.time}</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 500 }}>{a.title}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{a.desc}</p>
                      {a.actions.length > 0 && (
                        <div className="row gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                          {a.actions.map(act => (
                            <span key={act} className="dc-tag"><IconCheck size={10} /> {act}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {a.state === 'open' && (
                      <div className="row gap-2">
                        <button className="dc-btn dc-btn-ghost" style={{ padding: '8px 12px', fontSize: 12.5 }}>Resolve</button>
                        {a.id ? (
                          <Link to={`/patients/${PATIENT_ID}/alerts/${a.id}`} className="dc-btn dc-btn-primary" style={{ padding: '8px 12px', fontSize: 12.5 }}>Open</Link>
                        ) : (
                          <button className="dc-btn dc-btn-primary" style={{ padding: '8px 12px', fontSize: 12.5 }}>Open</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
