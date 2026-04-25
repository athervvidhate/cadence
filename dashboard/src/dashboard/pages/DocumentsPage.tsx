import { useState } from 'react';
import { IconDownload, IconCheck } from '../components/Icons';

type DocKind = 'discharge' | 'summary' | 'rx';

type Doc = {
  kind: DocKind;
  cat: string;
  name: string;
  sub: string;
  date: string;
  size: string;
  extracted?: boolean;
  new?: boolean;
  pending?: boolean;
};

const DOCS: Doc[] = [
  { kind: 'discharge', cat: 'Discharge', name: 'After-Visit Summary', sub: '4 pages · UCLA Health', date: 'Apr 22, 2026', size: '2.3 MB', extracted: true },
  { kind: 'rx', cat: 'Medications', name: 'Bottle scans · 8 medications', sub: 'Captured during onboarding', date: 'Apr 22, 2026', size: '4.1 MB', extracted: true },
  { kind: 'summary', cat: 'Pre-visit', name: 'Pre-visit summary · Day 7 cardiology', sub: 'Auto-drafted · ready to send', date: 'May 01, 2026', size: '180 KB', new: true },
  { kind: 'summary', cat: 'Pre-visit', name: 'Pre-visit summary · Day 14 PCP', sub: 'Will generate Day 13', date: 'May 08, 2026', size: '—', pending: true },
  { kind: 'discharge', cat: 'Lab', name: 'BMP · pre-discharge', sub: 'Potassium 4.1 · creatinine 1.2', date: 'Apr 21, 2026', size: '320 KB' },
  { kind: 'discharge', cat: 'Imaging', name: 'Chest X-ray report', sub: 'Cardiomegaly, mild pulmonary edema', date: 'Apr 21, 2026', size: '180 KB' },
];

const CATS = [
  { l: 'All', n: 12 },
  { l: 'Discharge', n: 1 },
  { l: 'Medications', n: 1 },
  { l: 'Pre-visit', n: 2 },
  { l: 'Lab', n: 4 },
  { l: 'Imaging', n: 2 },
  { l: 'Insurance', n: 2 },
];

function DocPreview({ kind }: { kind: DocKind }) {
  if (kind === 'discharge') {
    return (
      <div style={{ padding: '12px 10px', fontSize: 7, lineHeight: 1.45, color: '#3B413C', fontFamily: 'var(--font-serif)' }}>
        <div style={{ fontSize: 9, fontWeight: 600 }}>UCLA Health</div>
        <div style={{ fontSize: 6, color: '#6B716C' }}>After-Visit Summary</div>
        <div style={{ marginTop: 4, height: 1, background: '#E4DFD3' }} />
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ height: 3, background: '#E4DFD3', marginTop: 4, width: `${75 + (i * 7) % 25}%`, borderRadius: 1 }} />
        ))}
      </div>
    );
  }
  if (kind === 'summary') {
    return (
      <div style={{ padding: '12px 10px', fontSize: 7, lineHeight: 1.45, fontFamily: 'var(--font-sans)' }}>
        <div style={{ fontSize: 6, color: '#6B716C', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pre-visit summary</div>
        <div style={{ fontSize: 9, fontWeight: 600, marginTop: 4, fontFamily: 'var(--font-serif)' }}>Robert Chen · Day 7</div>
        <svg viewBox="0 0 80 30" style={{ marginTop: 6, width: '100%' }}>
          <path d="M 4 22 L 14 21 L 24 18 L 34 14 L 44 14 L 54 16 L 64 18 L 76 19" fill="none" stroke="oklch(0.52 0.09 155)" strokeWidth="1" />
        </svg>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 2.5, background: '#EFEAE0', marginTop: 3, width: `${60 + (i * 9) % 35}%`, borderRadius: 1 }} />
        ))}
      </div>
    );
  }
  if (kind === 'rx') {
    return (
      <div style={{ padding: '14px 12px', fontSize: 7, fontFamily: 'var(--font-mono)' }}>
        <div style={{ fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-serif)' }}>Rx</div>
        {['FUROSEMIDE 40 MG', 'METOPROLOL 25 MG', 'LISINOPRIL 10 MG', '+ 5 more'].map((line, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 6 : 3, padding: '4px 6px', background: '#FBF9F4', border: '1px solid #E4DFD3', borderRadius: 3 }}>{line}</div>
        ))}
      </div>
    );
  }
  return null;
}

export function DocumentsPage() {
  const [activeCat, setActiveCat] = useState('All');

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / ROBERT CHEN / DOCUMENTS</div>
        <div className="row gap-2">
          <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13, gap: 6 }}>
            <IconDownload size={14} /> Download all
          </button>
          <button className="dc-btn dc-btn-primary" style={{ fontSize: 13 }}>+ Upload</button>
        </div>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>12 documents · 1 new this week</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Documents
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Everything captured during onboarding plus auto-generated pre-visit summaries. All extracted text is searchable.
        </p>
      </div>

      {/* Filter + search row */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {CATS.map(c => (
          <button key={c.l} onClick={() => setActiveCat(c.l)} style={{
            padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: activeCat === c.l ? 'var(--ink)' : 'var(--surface)',
            color:      activeCat === c.l ? 'var(--bg-elev)' : 'var(--ink-2)',
            boxShadow: activeCat !== c.l ? '0 0 0 1px var(--hairline)' : 'none',
            fontSize: 13, display: 'flex', gap: 6, alignItems: 'center',
          }}>
            {c.l}
            <span style={{ fontSize: 11, opacity: 0.65, fontFamily: 'var(--font-mono)' }}>{c.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '8px 14px', background: 'var(--surface)',
          border: '1px solid var(--hairline)', borderRadius: 999,
          fontSize: 13, color: 'var(--ink-3)', minWidth: 220,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>⌕</span>
          Search documents…
        </div>
      </div>

      {/* Document grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {DOCS.map((d, i) => (
          <div key={i} className="dc-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 130, background: 'var(--bg-elev)', borderBottom: '1px solid var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 16, background: '#FFF', borderRadius: 4, boxShadow: '0 4px 14px rgba(26,31,27,0.06)', overflow: 'hidden' }}>
                <DocPreview kind={d.kind} />
              </div>
              {d.new && <span className="dc-pill green" style={{ position: 'absolute', top: 8, left: 8 }}><div className="dot" />new</span>}
              {d.pending && <span className="dc-pill neutral" style={{ position: 'absolute', top: 8, left: 8 }}>pending</span>}
            </div>
            <div style={{ padding: '12px 14px' }}>
              <span className="dc-tag">{d.cat}</span>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 6 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{d.sub}</div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                <span>{d.date}</span>
                <span>{d.size}</span>
              </div>
              {d.extracted && (
                <div style={{ marginTop: 8, padding: '6px 8px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderRadius: 6, fontSize: 11.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <IconCheck size={11} /> Extracted on-device
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
