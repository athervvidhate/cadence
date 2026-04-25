import { Fragment, useState } from 'react';
import { IconDownload } from '../components/Icons';

type MiniTrendProps = {
  data: number[];
  baseline?: number;
  threshold?: number;
  danger?: boolean;
  w?: number;
  h?: number;
};

function MiniTrend({ data, baseline, threshold, danger, w = 540, h = 130 }: MiniTrendProps) {
  const pad = 22;
  const vals = [...data, ...(baseline != null ? [baseline] : [])];
  const min = Math.min(...vals) - 2;
  const max = Math.max(...vals) + 2;
  const sx = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const sy = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const color = danger ? 'var(--danger)' : 'var(--accent)';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {baseline != null && (
        <line x1={pad} x2={w - pad} y1={sy(baseline)} y2={sy(baseline)}
          stroke="var(--hairline)" strokeDasharray="2 4" />
      )}
      {threshold != null && (
        <line x1={pad} x2={w - pad} y1={sy(threshold)} y2={sy(threshold)}
          stroke="var(--warn)" strokeDasharray="3 4" />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)}
          r={i === data.length - 1 ? 3 : 1.4}
          fill={i === data.length - 1 ? color : '#fff'}
          stroke={color}
          strokeWidth={i === data.length - 1 ? 0 : 1}
        />
      ))}
    </svg>
  );
}

type TrendCardProps = {
  title: string;
  sub: string;
  current: string;
  delta: string;
  deltaTone?: string;
  data: number[];
  baseline?: number;
  threshold?: number;
  danger?: boolean;
};

function TrendCard({ title, sub, current, delta, deltaTone, data, baseline, threshold, danger }: TrendCardProps) {
  const deltaColor =
    deltaTone === 'warn'   ? 'var(--warn-ink)'   :
    deltaTone === 'danger' ? 'var(--danger-ink)'  :
    deltaTone === 'good'   ? 'var(--accent-ink)'  :
    'var(--ink-3)';

  return (
    <div className="dc-card" style={{ padding: 18 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="dc-h-eyebrow">{title}</div>
          <div className="text-serif" style={{ fontSize: 30, marginTop: 4, lineHeight: 1 }}>{current}</div>
          <div style={{ fontSize: 12.5, color: deltaColor, marginTop: 4 }}>{delta}</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <MiniTrend data={data} baseline={baseline} threshold={threshold} danger={danger} />
      </div>
    </div>
  );
}

type SymptomCode = 'n' | 'm' | 'M' | 'e' | 'r';
const SYMPTOM_MAP: Record<SymptomCode, [string, string, string]> = {
  n: ['var(--accent-soft)', 'var(--accent-ink)', '·'],
  m: ['var(--warn-soft)',   'var(--warn-ink)',   'm'],
  M: ['var(--warn-soft)',   'var(--warn-ink)',   'M'],
  e: ['var(--warn-soft)',   'var(--warn-ink)',   'ex'],
  r: ['var(--danger-soft)', 'var(--danger-ink)', 'rest'],
};

const SYMPTOM_ROWS: Array<{ l: string; vals: SymptomCode[] }> = [
  { l: 'Breathing',  vals: ['n','n','n','e','e','e','r','e','e','n','n','n','n','n'] },
  { l: 'Swelling',   vals: ['n','n','n','n','m','m','m','m','m','n','n','n','n','n'] },
  { l: 'Chest pain', vals: ['n','n','n','n','n','n','n','n','n','n','n','n','n','n'] },
  { l: 'Fatigue',    vals: ['n','n','n','n','m','m','M','m','m','n','n','n','n','n'] },
];

const RANGES = ['7D', '14D', '30D', 'All'] as const;

export function TrendsPage() {
  const [activeRange, setActiveRange] = useState<string>('14D');

  const weight = [184, 184, 183.5, 184, 185, 186, 187, 186.5, 186, 185.5, 185, 184.5, 184, 184];
  const sleep  = [7.2, 6.9, 7.4, 7.1, 6.4, 5.9, 5.6, 6.1, 6.4, 6.8, 7, 7.1, 7.3, 7.2];
  const bp_s   = [128, 130, 132, 130, 134, 138, 142, 140, 136, 134, 132, 130, 128, 128];
  const hr     = [72, 74, 75, 73, 78, 82, 86, 84, 80, 78, 76, 74, 72, 72];

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / ROBERT CHEN / TRENDS</div>
        <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13, gap: 6 }}>
          <IconDownload size={14} /> Export CSV
        </button>
      </header>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>Last 14 days · Day 4 of 30</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
            How is Dad <em style={{ fontStyle: 'italic' }}>actually</em> doing?
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
            Weight, breathing, blood pressure, and sleep — pulled from voice check-ins twice daily.
          </p>
        </div>
        <div className="row gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, padding: 4, flexShrink: 0 }}>
          {RANGES.map(s => (
            <button key={s} onClick={() => setActiveRange(s)} style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12.5, border: 'none', cursor: 'pointer',
              background: activeRange === s ? 'var(--ink)' : 'transparent',
              color:      activeRange === s ? 'var(--bg)'  : 'var(--ink-2)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <TrendCard title="Weight" sub="lbs · AM weigh-in" current="186 lb"
          delta="+2 lb vs. baseline" deltaTone="warn" data={weight} baseline={184} threshold={186} />
        <TrendCard title="Resting heart rate" sub="bpm · check-in capture" current="78 bpm"
          delta="+6 bpm vs. baseline" deltaTone="warn" data={hr} baseline={72} />
        <TrendCard title="Systolic BP" sub="mmHg · self-report" current="138"
          delta="+10 vs. baseline" deltaTone="warn" data={bp_s} baseline={128} />
        <TrendCard title="Sleep quality" sub="hours · self-report" current="6.4 hrs"
          delta="-0.8 hrs vs. baseline" deltaTone="warn" data={sleep} baseline={7.2} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Symptom log · daily</div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '110px repeat(14, 1fr)', gap: 6, alignItems: 'center' }}>
            <div />
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="text-mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', textAlign: 'center' }}>D{i + 1}</div>
            ))}
            {SYMPTOM_ROWS.map(row => (
              <Fragment key={row.l}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{row.l}</div>
                {row.vals.map((v, i) => {
                  const [bg, fg, label] = SYMPTOM_MAP[v];
                  return (
                    <div key={i} style={{
                      background: bg, color: fg, height: 22, borderRadius: 4,
                      display: 'grid', placeItems: 'center',
                      fontSize: 9.5, fontFamily: 'var(--font-mono)',
                    }}>{label}</div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="row gap-3" style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)' }}>
            <span className="row gap-2"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-soft)', flexShrink: 0 }} />none</span>
            <span className="row gap-2"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warn-soft)', flexShrink: 0 }} />mild · exertion</span>
            <span className="row gap-2"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--danger-soft)', flexShrink: 0 }} />at rest</span>
          </div>
        </div>

        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Pattern detected</div>
          <h3 className="text-serif" style={{ fontSize: 22, lineHeight: 1.2, margin: '8px 0 0' }}>Sodium-load Sundays.</h3>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            On Days 4 and 11 (both Sundays), morning weight jumped &gt; 1.5 lb after the previous evening. Likely sodium intake from family meals.
          </p>
          <div className="dc-soft-card" style={{ padding: 12, marginTop: 12 }}>
            <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <IconAlert size={16} style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                Suggested: a Sunday evening voice prompt — "Anything salty for dinner today, Dad?" — to flag risk before Monday's weigh-in.
              </div>
            </div>
          </div>
          <button className="dc-btn dc-btn-ghost" style={{ marginTop: 12, padding: '8px 14px', fontSize: 13 }}>
            Add to plan
          </button>
        </div>
      </div>
    </>
  );
}
