import { IconChevron, IconChevronL, IconDoc } from '../components/Icons';

type EventKey = 'flag' | 'cardio' | 'pcp' | 'echo' | 'lab' | 'review';

const EVENT_COLORS: Record<EventKey, [string, string]> = {
  flag:   ['var(--danger-soft)', 'var(--danger-ink)'],
  cardio: ['var(--accent-soft)', 'var(--accent-ink)'],
  pcp:    ['var(--warn-soft)',   'var(--warn-ink)'],
  echo:   ['var(--accent-soft)', 'var(--accent-ink)'],
  lab:    ['var(--hairline-2)',  'var(--ink-2)'],
  review: ['var(--accent-soft)', 'var(--accent-ink)'],
};

const DAY_EVENTS: Record<number, Array<{ k: EventKey; l: string }>> = {
  4:  [{ k: 'flag',   l: 'Red flag' }],
  7:  [{ k: 'cardio', l: 'Cardiology' }],
  14: [{ k: 'pcp',    l: 'Primary care' }],
  21: [{ k: 'echo',   l: 'Echo' }],
  28: [{ k: 'lab',    l: 'Labs' }],
  30: [{ k: 'review', l: '30-day review' }],
};

type CalDay = { dayNum: number; events?: Array<{ k: EventKey; l: string }>; today: boolean; inMonth: boolean };

const DAYS: CalDay[] = Array.from({ length: 35 }).map((_, i) => {
  const dayNum = i - 1;
  return {
    dayNum,
    events: DAY_EVENTS[dayNum],
    today: dayNum === 4,
    inMonth: dayNum >= 1 && dayNum <= 30,
  };
});

export function AppointmentsPage() {
  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / ROBERT CHEN / APPOINTMENTS</div>
        <div className="row gap-2">
          <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Sync to Google Calendar</button>
          <button className="dc-btn dc-btn-primary" style={{ fontSize: 13 }}>+ Add appointment</button>
        </div>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>30-day care plan · April 22 → May 22</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Recovery calendar
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Follow-ups generated from the discharge plan, plus same-day clinic offers triggered by red flags.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Calendar */}
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="text-serif" style={{ fontSize: 22, margin: 0 }}>April 2026</h3>
            <div className="row gap-1">
              <button className="dc-btn dc-btn-ghost" style={{ padding: 8 }}><IconChevronL size={14} /></button>
              <button className="dc-btn dc-btn-ghost" style={{ padding: 8 }}><IconChevron size={14} /></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center', padding: '4px 0', letterSpacing: '0.08em' }}>{d}</div>
            ))}
            {DAYS.map((d, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 8, padding: 6,
                background: d.today ? 'var(--ink)' : d.inMonth ? 'var(--surface)' : 'transparent',
                color: d.today ? 'var(--bg-elev)' : d.inMonth ? 'var(--ink)' : 'var(--ink-4)',
                border: d.inMonth && !d.today ? '1px solid var(--hairline)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12,
              }}>
                <span className="text-mono" style={{ fontSize: 11, opacity: d.today ? 0.7 : 0.6 }}>
                  {d.inMonth ? `D${d.dayNum}` : ''}
                </span>
                {d.events?.map((e, ei) => {
                  const [bg, fg] = EVENT_COLORS[e.k];
                  return (
                    <div key={ei} style={{
                      background: bg, color: fg, fontSize: 9.5, padding: '2px 4px',
                      borderRadius: 3, fontWeight: 500, lineHeight: 1.1,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{e.l}</div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="col gap-3">
          <div className="dc-h-eyebrow">Upcoming · 4</div>
          {[
            { d: 'MAY 02', day: 'Day 7 · Sat', t: '9:30 AM', name: 'Cardiology', who: 'Dr. Patel · UCLA Heart', where: '100 Medical Plaza · Suite 600', urgent: false, tag: 'In-person', summary: true },
            { d: 'MAY 02', day: 'Day 7 · Sat', t: '2:00 PM', name: 'Same-day urgent', who: 'Cardiology rapid-access', where: "Pending Dad's confirmation", urgent: true, tag: 'Triggered by alert', summary: false },
            { d: 'MAY 09', day: 'Day 14 · Sat', t: '11:00 AM', name: 'Primary care', who: 'Dr. Hashimoto', where: '200 UCLA Medical · Floor 3', urgent: false, tag: 'In-person', summary: false },
            { d: 'MAY 22', day: 'Day 30 · Fri', t: '10:00 AM', name: '30-day review', who: 'Care team', where: 'Telehealth', urgent: false, tag: 'Video', summary: false },
          ].map((a, i) => (
            <div key={i} className="dc-card" style={{ padding: 14, position: 'relative' }}>
              {a.urgent && (
                <div style={{ position: 'absolute', top: -1, left: -1, right: -1, height: 3, background: 'var(--danger)', borderRadius: '14px 14px 0 0' }} />
              )}
              <div className="row gap-3">
                <div style={{ width: 54, textAlign: 'center', padding: '4px 0', background: 'var(--bg-elev)', borderRadius: 8, border: '1px solid var(--hairline)', flexShrink: 0 }}>
                  <div className="text-mono" style={{ fontSize: 9.5, color: 'var(--ink-3)' }}>{a.d.split(' ')[0]}</div>
                  <div className="text-serif" style={{ fontSize: 22, lineHeight: 1 }}>{a.d.split(' ')[1]}</div>
                </div>
                <div className="col flex-1" style={{ gap: 2 }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</span>
                    <span className="dc-tag" style={{ background: a.urgent ? 'var(--danger-soft)' : 'var(--hairline-2)', color: a.urgent ? 'var(--danger-ink)' : 'var(--ink-3)' }}>{a.tag}</span>
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{a.t} · {a.day}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{a.who}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{a.where}</span>
                  {a.summary && (
                    <div className="row gap-2" style={{ marginTop: 6 }}>
                      <span className="dc-tag" style={{ background: 'var(--ink)', color: 'var(--bg-elev)' }}>
                        <IconDoc size={10} /> Pre-visit summary ready
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
