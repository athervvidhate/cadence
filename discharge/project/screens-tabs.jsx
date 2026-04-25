// Caregiver dashboard — secondary tabs (Trends, Medications, Alerts, Appointments, Documents)

const TabFrame = ({ active, crumb, actions, children }) => (
  <div className="dc-dash">
    <SideNav active={active} />
    <div className="dc-dash-main" style={{ overflow: 'auto' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 22 }}>
        <div className="row gap-2 text-mono" style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
          <span>PATIENTS</span><IconChevron size={12}/>
          <span>ROBERT CHEN</span><IconChevron size={12}/>
          <span style={{ color: 'var(--ink)' }}>{crumb}</span>
        </div>
        <div className="row gap-2">{actions}</div>
      </div>
      {children}
    </div>
  </div>
);

const PageHeader = ({ eyebrow, title, sub, right }) => (
  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
    <div>
      <span className="dc-h-eyebrow">{eyebrow}</span>
      <h1 className="text-serif" style={{ fontSize: 38, lineHeight: 1.05, margin: '8px 0 0', letterSpacing: '-0.01em' }}>{title}</h1>
      {sub && <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>{sub}</p>}
    </div>
    {right}
  </div>
);

// ─────────────────── TRENDS ───────────────────
const MiniTrend = ({ title, unit, data, baseline, danger, threshold, w = 540, h = 130 }) => {
  const pad = 22;
  const min = Math.min(...data, baseline ?? Infinity) - 2;
  const max = Math.max(...data, baseline ?? -Infinity) + 2;
  const sx = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const sy = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {baseline != null && <line x1={pad} x2={w-pad} y1={sy(baseline)} y2={sy(baseline)} stroke="var(--hairline)" strokeDasharray="2 4"/>}
      {threshold != null && <line x1={pad} x2={w-pad} y1={sy(threshold)} y2={sy(threshold)} stroke="var(--warn)" strokeDasharray="3 4"/>}
      <path d={path} fill="none" stroke={danger ? 'var(--danger)' : 'var(--accent)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={i === data.length - 1 ? 3 : 1.4} fill={i === data.length - 1 ? (danger ? 'var(--danger)' : 'var(--accent)') : '#fff'} stroke={danger ? 'var(--danger)' : 'var(--accent)'} strokeWidth={i === data.length - 1 ? 0 : 1}/>
      ))}
    </svg>
  );
};

const TrendCard = ({ title, sub, current, delta, deltaTone, data, baseline, threshold, danger }) => (
  <div className="dc-card" style={{ padding: 18 }}>
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="dc-h-eyebrow">{title}</div>
        <div className="text-serif" style={{ fontSize: 30, marginTop: 4, lineHeight: 1 }}>{current}</div>
        <div style={{ fontSize: 12.5, color: deltaTone === 'warn' ? 'var(--warn-ink)' : deltaTone === 'danger' ? 'var(--danger-ink)' : deltaTone === 'good' ? 'var(--accent-ink)' : 'var(--ink-3)', marginTop: 4 }}>{delta}</div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sub}</span>
    </div>
    <div style={{ marginTop: 8 }}>
      <MiniTrend data={data} baseline={baseline} threshold={threshold} danger={danger} />
    </div>
  </div>
);

const ScreenTrends = () => {
  const weight = [184, 184, 183.5, 184, 185, 186, 187, 186.5, 186, 185.5, 185, 184.5, 184, 184];
  const sleep  = [7.2, 6.9, 7.4, 7.1, 6.4, 5.9, 5.6, 6.1, 6.4, 6.8, 7, 7.1, 7.3, 7.2];
  const bp_s   = [128, 130, 132, 130, 134, 138, 142, 140, 136, 134, 132, 130, 128, 128];
  const hr     = [72, 74, 75, 73, 78, 82, 86, 84, 80, 78, 76, 74, 72, 72];
  return (
    <TabFrame active="Trends" crumb="TRENDS" actions={[
      <button key="r" className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}><IconDownload size={14}/> Export CSV</button>
    ]}>
      <PageHeader eyebrow="Last 14 days · Day 4 of 30" title={<>How is Dad <em style={{ fontStyle: 'italic' }}>actually</em> doing?</>} sub="Weight, breathing, blood pressure, and sleep — pulled from voice check-ins twice daily."
        right={
          <div className="row gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, padding: 4 }}>
            {['7D','14D','30D','All'].map((s, i) => (
              <div key={s} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12.5, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--bg)' : 'var(--ink-2)' }}>{s}</div>
            ))}
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <TrendCard title="Weight" sub="lbs · AM weigh-in" current="186 lb" delta="+2 lb vs. baseline" deltaTone="warn" data={weight} baseline={184} threshold={186} />
        <TrendCard title="Resting heart rate" sub="bpm · check-in capture" current="78 bpm" delta="+6 bpm vs. baseline" deltaTone="warn" data={hr} baseline={72} />
        <TrendCard title="Systolic BP" sub="mmHg · self-report" current="138" delta="+10 vs. baseline" deltaTone="warn" data={bp_s} baseline={128} />
        <TrendCard title="Sleep quality" sub="hours · self-report" current="6.4 hrs" delta="-0.8 hrs vs. baseline" deltaTone="warn" data={sleep} baseline={7.2} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Symptom log · daily</div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '110px repeat(14, 1fr)', gap: 6, alignItems: 'center' }}>
            <div/>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="text-mono" style={{ fontSize: 9.5, color: 'var(--ink-3)', textAlign: 'center' }}>D{i+1}</div>
            ))}
            {[
              { l: 'Breathing', vals: ['n','n','n','e','e','e','r','e','e','n','n','n','n','n'] },
              { l: 'Swelling',  vals: ['n','n','n','n','m','m','m','m','m','n','n','n','n','n'] },
              { l: 'Chest pain',vals: ['n','n','n','n','n','n','n','n','n','n','n','n','n','n'] },
              { l: 'Fatigue',   vals: ['n','n','n','n','m','m','M','m','m','n','n','n','n','n'] },
            ].map(row => (
              <React.Fragment key={row.l}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{row.l}</div>
                {row.vals.map((v, i) => {
                  const map = { n: ['var(--accent-soft)', 'var(--accent-ink)', '·'], m: ['var(--warn-soft)','var(--warn-ink)','m'], M: ['var(--warn-soft)','var(--warn-ink)','M'], e: ['var(--warn-soft)','var(--warn-ink)','ex'], r: ['var(--danger-soft)','var(--danger-ink)','rest'] };
                  const [bg, fg, label] = map[v];
                  return <div key={i} style={{ background: bg, color: fg, height: 22, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{label}</div>;
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="row gap-3" style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-3)' }}>
            <span className="row gap-2"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-soft)' }}/>none</span>
            <span className="row gap-2"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warn-soft)' }}/>mild · exertion</span>
            <span className="row gap-2"><div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--danger-soft)' }}/>at rest</span>
          </div>
        </div>

        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Pattern detected</div>
          <h3 className="text-serif" style={{ fontSize: 22, lineHeight: 1.2, margin: '8px 0 0' }}>Sodium-load Sundays.</h3>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            On Days 4 and 11 (both Sundays), morning weight jumped {'>'} 1.5 lb after the previous evening. Likely sodium intake from family meals.
          </p>
          <div className="dc-soft-card" style={{ padding: 12, marginTop: 12 }}>
            <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
              <IconAlert size={16} style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: 2 }}/>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                Suggested: a Sunday evening voice prompt — "Anything salty for dinner today, Dad?" — to flag risk before Monday's weigh-in.
              </div>
            </div>
          </div>
          <button className="dc-btn dc-btn-ghost" style={{ marginTop: 12, padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}>Add to plan</button>
        </div>
      </div>
    </TabFrame>
  );
};

// ─────────────────── MEDICATIONS ───────────────────
const ScreenMedications = () => {
  const meds = [
    { n: 'Furosemide', d: '40 mg', f: '2× daily', sched: '8:00 AM · 8:00 PM', class: 'Loop diuretic', ind: 'Reduces fluid overload', adh: 96, last: '8:14 AM today', tone: 'good' },
    { n: 'Metoprolol succinate', d: '25 mg', f: 'Daily', sched: '8:00 AM', class: 'Beta-blocker', ind: 'Slows heart rate, lowers BP', adh: 100, last: '8:14 AM today', tone: 'good', warn: 'Bottle says 50 mg — pharmacy review pending' },
    { n: 'Lisinopril', d: '10 mg', f: 'Daily', sched: '8:00 AM', class: 'ACE inhibitor', ind: 'Lowers BP, protects heart', adh: 100, last: '8:14 AM today', tone: 'good' },
    { n: 'Spironolactone', d: '25 mg', f: 'Daily', sched: '8:00 AM', class: 'K-sparing diuretic', ind: 'Aldosterone antagonist', adh: 100, last: '8:14 AM today', tone: 'good' },
    { n: 'Potassium chloride', d: '20 mEq', f: 'Daily', sched: '8:00 AM', class: 'Electrolyte', ind: 'Replaces potassium lost to diuretic', adh: 86, last: '8:14 AM today', tone: 'warn' },
    { n: 'Atorvastatin', d: '40 mg', f: 'Daily', sched: '9:00 PM', class: 'Statin', ind: 'Lowers cholesterol', adh: 100, last: 'Yesterday 9:08 PM', tone: 'good' },
    { n: 'Aspirin', d: '81 mg', f: 'Daily', sched: '8:00 AM', class: 'Antiplatelet', ind: 'Prevents clots', adh: 100, last: '8:14 AM today', tone: 'good' },
    { n: 'Pantoprazole', d: '40 mg', f: 'Daily', sched: '7:30 AM', class: 'PPI', ind: 'Stomach protection', adh: 92, last: '7:38 AM today', tone: 'good' },
  ];

  return (
    <TabFrame active="Medications" crumb="MEDICATIONS" actions={[
      <button key="a" className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}>Print regimen</button>,
      <button key="b" className="dc-btn dc-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>+ Add medication</button>,
    ]}>
      <PageHeader eyebrow="8 active · 1 review pending" title="Daily regimen" sub="Reconciled against the discharge paperwork and the dispensed bottles. Adherence is tracked by voice confirmation each dose." />

      {/* Schedule rail */}
      <div className="dc-card" style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="dc-h-eyebrow">Today's schedule</div>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Tap a slot for details</span>
        </div>
        <div style={{ position: 'relative', marginTop: 18, height: 60 }}>
          <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 2, background: 'var(--hairline)' }}/>
          {[
            { t: '7:30 AM', meds: ['Pantoprazole'], status: 'taken' },
            { t: '8:00 AM', meds: ['Furosemide','Metoprolol','Lisinopril','Spironolactone','Potassium','Aspirin'], status: 'taken' },
            { t: '8:00 PM', meds: ['Furosemide'], status: 'upcoming' },
            { t: '9:00 PM', meds: ['Atorvastatin'], status: 'upcoming' },
          ].map((slot, i, arr) => {
            const left = (i / (arr.length - 1)) * 92 + 4;
            const taken = slot.status === 'taken';
            return (
              <div key={i} style={{ position: 'absolute', left: `${left}%`, transform: 'translateX(-50%)', top: 0, width: 130, textAlign: 'center' }}>
                <div className="text-mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{slot.t}</div>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: taken ? 'var(--accent)' : 'var(--surface)', border: taken ? 'none' : '2px dashed var(--hairline)', margin: '6px auto 0', display: 'grid', placeItems: 'center' }}>
                  {taken && <IconCheck size={12} style={{ color: '#fff' }}/>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4 }}>{slot.meds.length} med{slot.meds.length>1?'s':''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Med table */}
      <div className="dc-card" style={{ padding: 0, marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.6fr 1fr 60px', padding: '12px 18px', borderBottom: '1px solid var(--hairline)', fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span>Drug</span><span>Schedule</span><span>Indication</span><span>7-day adherence</span><span></span>
        </div>
        {meds.map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.6fr 1fr 60px', padding: '14px 18px', borderBottom: i < meds.length-1 ? '1px solid var(--hairline)' : 'none', alignItems: 'center' }}>
            <div className="col" style={{ gap: 2 }}>
              <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{m.n}</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{m.d}</span>
                {m.warn && <span className="dc-pill yellow"><div className="dot"/>review</span>}
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
                <div style={{ width: `${m.adh}%`, height: '100%', background: m.tone === 'warn' ? 'var(--warn)' : 'var(--accent)' }}/>
              </div>
            </div>
            <IconChevron size={14} style={{ color: 'var(--ink-3)', justifySelf: 'end' }}/>
          </div>
        ))}
      </div>

      {/* Interactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Interactions monitored</div>
          <div className="col" style={{ marginTop: 10 }}>
            {[
              { d: 'Furosemide + Lisinopril', s: 'moderate', n: 'Monitor potassium · risk of hypotension' },
              { d: 'Spironolactone + Potassium Cl', s: 'moderate', n: 'Risk of hyperkalemia · check labs at Day 7' },
              { d: 'Atorvastatin + grapefruit', s: 'moderate', n: 'Avoid grapefruit juice in patient instructions' },
            ].map((it, i, arr) => (
              <div key={i} className="row" style={{ padding: '10px 0', borderBottom: i < arr.length-1 ? '1px solid var(--hairline)' : 'none', justifyContent: 'space-between', gap: 10 }}>
                <div className="col" style={{ gap: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{it.d}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.n}</span>
                </div>
                <span className="dc-pill yellow"><div className="dot"/>{it.s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="dc-h-eyebrow">Refills</div>
          <div className="col" style={{ marginTop: 10 }}>
            {[
              { n: 'Furosemide', d: '14 days left', tone: 'warn' },
              { n: 'Lisinopril', d: '24 days left', tone: 'good' },
              { n: 'Potassium Cl', d: '8 days left', tone: 'danger' },
              { n: 'Atorvastatin', d: '30+ days', tone: 'good' },
            ].map((it, i, arr) => (
              <div key={i} className="row" style={{ padding: '10px 0', borderBottom: i < arr.length-1 ? '1px solid var(--hairline)' : 'none', justifyContent: 'space-between' }}>
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
    </TabFrame>
  );
};

// ─────────────────── ALERTS ───────────────────
const ScreenAlerts = () => {
  const groups = [
    {
      day: 'Today · Apr 25',
      items: [
        { time: '9:04 AM', tone: 'red', title: 'Red flag · weight + new SOB on exertion', desc: 'Day 4. +3 lb in 24h plus new shortness of breath walking to the kitchen. Pattern matches early CHF decompensation.', actions: ['SMS sent to Sarah', 'Cardiology offered'], state: 'open' },
        { time: '8:04 AM', tone: 'yellow', title: 'Weight gain 3 lb in 24h', desc: 'Threshold: > 2 lb / 24 h. Logged from morning weigh-in.', actions: ['Watch'], state: 'open' },
      ]
    },
    {
      day: 'Yesterday · Apr 24',
      items: [
        { time: '11:42 PM', tone: 'yellow', title: 'Late evening dose · Furosemide', desc: '1 hour 42 minutes past scheduled time. Patient confirmed taken.', actions: ['Resolved automatically'], state: 'resolved' },
      ]
    },
    {
      day: 'Day 2 · Apr 23',
      items: [
        { time: '9:42 PM', tone: 'yellow', title: 'Missed evening Furosemide', desc: 'Patient took missed dose at 9:42 PM after second voice prompt.', actions: ['Resolved'], state: 'resolved' },
        { time: '8:30 AM', tone: 'green', title: 'First check-in complete', desc: 'Weight 184 lb · breathing clear · all morning meds taken.', actions: [], state: 'info' },
      ]
    },
  ];

  return (
    <TabFrame active="Alerts" crumb="ALERTS" actions={[
      <button key="m" className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}>Notification settings</button>,
    ]}>
      <PageHeader eyebrow="2 open · 4 resolved this week" title={<><em style={{ fontStyle: 'italic' }}>2 things</em> need your attention.</>} sub="Sorted newest first. Yellow flags watch for patterns; red flags trigger SMS and a same-day clinic offer."
        right={
          <div className="row gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, padding: 4 }}>
            {['All','Open','Red','Yellow','Resolved'].map((s, i) => (
              <div key={s} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12.5, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--bg)' : 'var(--ink-2)' }}>{s}</div>
            ))}
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        {[
          { l: 'Open red flags', v: '1', tone: 'danger' },
          { l: 'Open yellow flags', v: '1', tone: 'warn' },
          { l: 'Resolved · 30 d', v: '4', tone: 'good' },
          { l: 'Avg time to ack', v: '11 min', tone: '' },
        ].map((s, i) => (
          <div key={i} className="dc-card" style={{ padding: 14 }}>
            <div className="dc-h-eyebrow">{s.l}</div>
            <div className="text-serif" style={{ fontSize: 28, marginTop: 4, color: s.tone === 'danger' ? 'var(--danger-ink)' : s.tone === 'warn' ? 'var(--warn-ink)' : s.tone === 'good' ? 'var(--accent-ink)' : 'var(--ink)' }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="col gap-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            <div className="row" style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="dc-h-eyebrow">{g.day}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }}/>
            </div>
            <div className="col gap-2">
              {g.items.map((a, i) => (
                <div key={i} className="dc-card" style={{ padding: 16, borderLeft: a.tone === 'red' ? '3px solid var(--danger)' : a.tone === 'yellow' ? '3px solid var(--warn)' : '3px solid var(--accent)' }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                    <div className="col" style={{ flex: 1, gap: 4 }}>
                      <div className="row gap-2" style={{ alignItems: 'center' }}>
                        <span className={`dc-pill ${a.tone}`}><div className="dot"/>{a.tone === 'red' ? 'Red flag' : a.tone === 'yellow' ? 'Yellow' : 'Info'}</span>
                        {a.state === 'resolved' && <span className="dc-tag">resolved</span>}
                        <span className="text-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.time}</span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 500 }}>{a.title}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{a.desc}</p>
                      {a.actions.length > 0 && (
                        <div className="row gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                          {a.actions.map(act => <span key={act} className="dc-tag"><IconCheck size={10}/> {act}</span>)}
                        </div>
                      )}
                    </div>
                    {a.state === 'open' && (
                      <div className="row gap-2">
                        <button className="dc-btn dc-btn-ghost" style={{ padding: '8px 12px', fontSize: 12.5, background: 'var(--bg-elev)' }}>Resolve</button>
                        <button className="dc-btn dc-btn-primary" style={{ padding: '8px 12px', fontSize: 12.5 }}>Open</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </TabFrame>
  );
};

// ─────────────────── APPOINTMENTS ───────────────────
const ScreenAppointments = () => {
  const days = Array.from({ length: 35 }).map((_, i) => {
    const dayNum = i - 2 + 1;
    const events = {
      4: [{ k: 'flag', l: 'Red flag' }],
      7: [{ k: 'cardio', l: 'Cardiology' }],
      14: [{ k: 'pcp', l: 'Primary care' }],
      21: [{ k: 'echo', l: 'Echo' }],
      28: [{ k: 'lab', l: 'Labs' }],
      30: [{ k: 'review', l: '30-day review' }],
    }[dayNum];
    return { dayNum, events, today: dayNum === 4, inMonth: dayNum >= 1 && dayNum <= 30 };
  });

  return (
    <TabFrame active="Appointments" crumb="APPOINTMENTS" actions={[
      <button key="a" className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}>Sync to Google Calendar</button>,
      <button key="b" className="dc-btn dc-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>+ Add appointment</button>,
    ]}>
      <PageHeader eyebrow="30-day care plan · April 22 → May 22" title="Recovery calendar"
        sub="Follow-ups generated from the discharge plan, plus same-day clinic offers triggered by red flags." />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Calendar */}
        <div className="dc-card" style={{ padding: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="text-serif" style={{ fontSize: 22, margin: 0 }}>April 2026</h3>
            <div className="row gap-1">
              <button className="dc-btn dc-btn-ghost" style={{ padding: 8, background: 'var(--bg-elev)' }}><IconChevronL size={14}/></button>
              <button className="dc-btn dc-btn-ghost" style={{ padding: 8, background: 'var(--bg-elev)' }}><IconChevron size={14}/></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['S','M','T','W','T','F','S'].map(d => (
              <div key={d} className="text-mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center', padding: '4px 0', letterSpacing: '0.08em' }}>{d}</div>
            ))}
            {days.map((d, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 8, padding: 6,
                background: d.today ? 'var(--ink)' : d.inMonth ? 'var(--surface)' : 'transparent',
                color: d.today ? 'var(--bg-elev)' : d.inMonth ? 'var(--ink)' : 'var(--ink-4)',
                border: d.inMonth && !d.today ? '1px solid var(--hairline)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12,
                position: 'relative'
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: d.today ? 0.7 : 0.6 }}>{d.inMonth ? `D${d.dayNum}` : ''}</span>
                {d.events && d.events.map((e, ei) => {
                  const colors = {
                    flag: ['var(--danger-soft)', 'var(--danger-ink)'],
                    cardio: ['var(--accent-soft)', 'var(--accent-ink)'],
                    pcp: ['var(--warn-soft)', 'var(--warn-ink)'],
                    echo: ['var(--accent-soft)', 'var(--accent-ink)'],
                    lab: ['var(--hairline-2)', 'var(--ink-2)'],
                    review: ['var(--accent-soft)', 'var(--accent-ink)'],
                  }[e.k];
                  return <div key={ei} style={{ background: colors[0], color: colors[1], fontSize: 9.5, padding: '2px 4px', borderRadius: 3, fontWeight: 500, lineHeight: 1.1, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{e.l}</div>;
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="col gap-3">
          <div className="dc-h-eyebrow">Upcoming · 4</div>
          {[
            { d: 'MAY 02', day: 'Day 7 · Sat', t: '9:30 AM', name: 'Cardiology', who: 'Dr. Patel · UCLA Heart', where: '100 Medical Plaza · Suite 600', tone: 'accent', tag: 'In-person', summary: true, urgent: false },
            { d: 'MAY 02', day: 'Day 7 · Sat', t: '2:00 PM', name: 'Same-day urgent', who: 'Cardiology rapid-access', where: 'Pending Dad\'s confirmation', tone: 'danger', tag: 'Triggered by alert', urgent: true },
            { d: 'MAY 09', day: 'Day 14 · Sat', t: '11:00 AM', name: 'Primary care', who: 'Dr. Hashimoto', where: '200 UCLA Medical · Floor 3', tone: 'warn', tag: 'In-person' },
            { d: 'MAY 22', day: 'Day 30 · Fri', t: '10:00 AM', name: '30-day review', who: 'Care team', where: 'Telehealth', tone: 'accent', tag: 'Video' },
          ].map((a, i) => (
            <div key={i} className="dc-card" style={{ padding: 14, position: 'relative' }}>
              {a.urgent && <div style={{ position: 'absolute', top: -1, left: -1, right: -1, height: 3, background: 'var(--danger)', borderRadius: '14px 14px 0 0' }}/>}
              <div className="row gap-3">
                <div style={{ width: 54, textAlign: 'center', padding: '4px 0', background: 'var(--bg-elev)', borderRadius: 8, border: '1px solid var(--hairline)' }}>
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
                      <span className="dc-tag" style={{ background: 'var(--ink)', color: 'var(--bg-elev)' }}><IconDoc size={10}/> Pre-visit summary ready</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TabFrame>
  );
};

// ─────────────────── DOCUMENTS ───────────────────
const DocPreview = ({ kind }) => {
  if (kind === 'discharge') {
    return (
      <div style={{ padding: '12px 10px', fontSize: 7, lineHeight: 1.45, color: '#3B413C', fontFamily: 'var(--font-serif)' }}>
        <div style={{ fontSize: 9, fontWeight: 600 }}>UCLA Health</div>
        <div style={{ fontSize: 6, color: '#6B716C' }}>After-Visit Summary</div>
        <div style={{ marginTop: 4, height: 1, background: '#E4DFD3' }}/>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ height: 3, background: '#E4DFD3', marginTop: 4, width: `${75 + (i*7)%25}%`, borderRadius: 1 }}/>
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
          <path d="M 4 22 L 14 21 L 24 18 L 34 14 L 44 14 L 54 16 L 64 18 L 76 19" fill="none" stroke="oklch(0.52 0.09 155)" strokeWidth="1"/>
        </svg>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ height: 2.5, background: '#EFEAE0', marginTop: 3, width: `${60+(i*9)%35}%`, borderRadius: 1 }}/>
        ))}
      </div>
    );
  }
  if (kind === 'rx') {
    return (
      <div style={{ padding: '14px 12px', fontSize: 7, fontFamily: 'var(--font-mono)' }}>
        <div style={{ fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-serif)' }}>Rx</div>
        <div style={{ marginTop: 6, padding: '4px 6px', background: '#FBF9F4', border: '1px solid #E4DFD3', borderRadius: 3 }}>FUROSEMIDE 40 MG</div>
        <div style={{ marginTop: 3, padding: '4px 6px', background: '#FBF9F4', border: '1px solid #E4DFD3', borderRadius: 3 }}>METOPROLOL 25 MG</div>
        <div style={{ marginTop: 3, padding: '4px 6px', background: '#FBF9F4', border: '1px solid #E4DFD3', borderRadius: 3 }}>LISINOPRIL 10 MG</div>
        <div style={{ marginTop: 3, padding: '4px 6px', background: '#FBF9F4', border: '1px solid #E4DFD3', borderRadius: 3 }}>+ 5 more</div>
      </div>
    );
  }
  return null;
};

const ScreenDocuments = () => {
  const docs = [
    { kind: 'discharge', cat: 'Discharge', name: 'After-Visit Summary', sub: '4 pages · UCLA Health', date: 'Apr 22, 2026', size: '2.3 MB', extracted: true },
    { kind: 'rx', cat: 'Medications', name: 'Bottle scans · 8 medications', sub: 'Captured during onboarding', date: 'Apr 22, 2026', size: '4.1 MB', extracted: true },
    { kind: 'summary', cat: 'Pre-visit', name: 'Pre-visit summary · Day 7 cardiology', sub: 'Auto-drafted · ready to send', date: 'May 01, 2026', size: '180 KB', new: true },
    { kind: 'summary', cat: 'Pre-visit', name: 'Pre-visit summary · Day 14 PCP', sub: 'Will generate Day 13', date: 'May 08, 2026', size: '—', pending: true },
    { kind: 'discharge', cat: 'Lab', name: 'BMP · pre-discharge', sub: 'Potassium 4.1 · creatinine 1.2', date: 'Apr 21, 2026', size: '320 KB' },
    { kind: 'discharge', cat: 'Imaging', name: 'Chest X-ray report', sub: 'Cardiomegaly, mild pulmonary edema', date: 'Apr 21, 2026', size: '180 KB' },
  ];

  const cats = [
    { l: 'All', n: 12, a: true },
    { l: 'Discharge', n: 1 },
    { l: 'Medications', n: 1 },
    { l: 'Pre-visit', n: 2 },
    { l: 'Lab', n: 4 },
    { l: 'Imaging', n: 2 },
    { l: 'Insurance', n: 2 },
  ];

  return (
    <TabFrame active="Documents" crumb="DOCUMENTS" actions={[
      <button key="a" className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}><IconDownload size={14}/> Download all</button>,
      <button key="b" className="dc-btn dc-btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>+ Upload</button>,
    ]}>
      <PageHeader eyebrow="12 documents · 1 new this week" title="Documents" sub="Everything captured during onboarding plus auto-generated pre-visit summaries. All extracted text is searchable." />

      <div className="row gap-2" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <div key={c.l} style={{
            padding: '8px 14px', borderRadius: 999,
            background: c.a ? 'var(--ink)' : 'var(--surface)',
            color: c.a ? 'var(--bg-elev)' : 'var(--ink-2)',
            border: c.a ? 'none' : '1px solid var(--hairline)',
            fontSize: 13, display: 'flex', gap: 6, alignItems: 'center'
          }}>
            {c.l}
            <span style={{ fontSize: 11, opacity: 0.7, fontFamily: 'var(--font-mono)' }}>{c.n}</span>
          </div>
        ))}
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, fontSize: 13, color: 'var(--ink-3)', minWidth: 220 }}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>⌕</span>
          Search documents…
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {docs.map((d, i) => (
          <div key={i} className="dc-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 130, background: 'var(--bg-elev)', borderBottom: '1px solid var(--hairline)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 16, background: '#FFF', borderRadius: 4, boxShadow: '0 4px 14px rgba(26,31,27,0.06)', overflow: 'hidden' }}>
                <DocPreview kind={d.kind} />
              </div>
              {d.new && <span className="dc-pill green" style={{ position: 'absolute', top: 8, left: 8 }}><div className="dot"/>new</span>}
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
                  <IconCheck size={11}/> Extracted on-device
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </TabFrame>
  );
};

Object.assign(window, { ScreenTrends, ScreenMedications, ScreenAlerts, ScreenAppointments, ScreenDocuments });
