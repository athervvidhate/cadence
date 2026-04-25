// Caregiver web dashboard + alert detail + time-warp control

const Sparkline = ({ data, w = 280, h = 60, danger = false }) => {
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 4;
  const sx = (i) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const sy = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const area = `${path} L ${sx(data.length-1)} ${h-pad} L ${sx(0)} ${h-pad} Z`;
  const stroke = danger ? 'var(--danger)' : 'var(--accent)';
  const fill = danger ? 'color-mix(in srgb, var(--danger) 12%, transparent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)';
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={i === data.length - 1 ? 3.5 : 1.6} fill={i === data.length - 1 ? stroke : '#fff'} stroke={stroke} strokeWidth={i === data.length - 1 ? 0 : 1.2}/>
      ))}
    </svg>
  );
};

const StatusHeadline = ({ level }) => {
  const map = {
    green: { label: 'Stable', tone: 'green', word: 'looking steady', detail: 'Weight, breathing, and meds are all on track.' },
    yellow: { label: 'Watch', tone: 'yellow', word: 'worth watching', detail: '3 lb gain since yesterday. Breathing slightly tight on exertion.' },
    red: { label: 'Action needed', tone: 'red', word: 'a red flag', detail: 'Pattern consistent with early CHF decompensation. SMS sent to you 9:04 AM.' }
  }[level];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: level === 'red' ? 'var(--danger-soft)' : level === 'yellow' ? 'var(--warn-soft)' : 'var(--accent-soft)',
        color: level === 'red' ? 'var(--danger-ink)' : level === 'yellow' ? 'var(--warn-ink)' : 'var(--accent-ink)',
        display: 'grid', placeItems: 'center'
      }}>
        {level === 'green' ? <IconCheck size={28} /> : <IconAlert size={28} />}
      </div>
      <div style={{ flex: 1 }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span className={`dc-pill ${map.tone}`}><div className="dot"/>{map.label}</span>
          <span className="dc-tag">Day 4 of 30</span>
          <span className="dc-tag">Last check-in · 8:04 AM</span>
        </div>
        <h1 className="text-serif" style={{ fontSize: 38, lineHeight: 1.1, margin: '10px 0 0', letterSpacing: '-0.01em' }}>
          Dad is <em style={{ fontStyle: 'italic' }}>{map.word}</em>.
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--ink-2)', maxWidth: 580, lineHeight: 1.5 }}>{map.detail}</p>
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub, tone }) => (
  <div style={{ padding: '18px 18px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 14 }}>
    <div className="dc-h-eyebrow">{label}</div>
    <div className="text-serif" style={{ fontSize: 36, lineHeight: 1.05, marginTop: 6, letterSpacing: '-0.01em' }}>{value}</div>
    {sub && <div style={{ fontSize: 13, color: tone === 'warn' ? 'var(--warn-ink)' : tone === 'danger' ? 'var(--danger-ink)' : tone === 'good' ? 'var(--accent-ink)' : 'var(--ink-3)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const SideNav = () => (
  <div className="dc-dash-side">
    <div className="row gap-2" style={{ padding: '4px 12px 18px', alignItems: 'center' }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
        <IconHeart size={14} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>DischargeCoach</span>
    </div>

    <div className="dc-h-eyebrow" style={{ padding: '6px 12px' }}>Patients</div>
    <div className="dc-nav-item active">
      <div style={{ width: 22, height: 22, borderRadius: 11, background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', fontSize: 11, fontFamily: 'var(--font-serif)' }}>R</div>
      <span style={{ flex: 1 }}>Robert Chen</span>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--warn)' }}/>
    </div>
    <div className="dc-nav-item">
      <div style={{ width: 22, height: 22, borderRadius: 11, background: 'var(--hairline-2)', display: 'grid', placeItems: 'center', fontSize: 11, fontFamily: 'var(--font-serif)' }}>M</div>
      <span style={{ flex: 1 }}>Margaret Liu</span>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)' }}/>
    </div>
    <div className="dc-nav-item" style={{ color: 'var(--ink-3)' }}>+ Add patient</div>

    <div style={{ height: 1, background: 'var(--hairline)', margin: '14px 6px' }} />

    <div className="dc-h-eyebrow" style={{ padding: '6px 12px' }}>Robert</div>
    {[
      { ic: <IconHome size={16}/>, l: 'Overview', a: true },
      { ic: <IconChart size={16}/>, l: 'Trends' },
      { ic: <IconPill size={16}/>, l: 'Medications' },
      { ic: <IconBell size={16}/>, l: 'Alerts', tag: '2' },
      { ic: <IconCal size={16}/>, l: 'Appointments' },
      { ic: <IconDoc size={16}/>, l: 'Documents' },
    ].map((it, i) => (
      <div key={i} className={`dc-nav-item ${it.a ? 'active' : ''}`}>
        {it.ic}<span style={{ flex: 1 }}>{it.l}</span>
        {it.tag && <span className="dc-tag" style={{ background: 'var(--danger-soft)', color: 'var(--danger-ink)' }}>{it.tag}</span>}
      </div>
    ))}

    <div style={{ flex: 1 }}/>

    <div className="dc-soft-card" style={{ padding: 12 }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-serif)' }}>S</div>
        <div className="col" style={{ gap: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Sarah Chen</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>caregiver</span>
        </div>
      </div>
    </div>
  </div>
);

const DashboardCommon = ({ level }) => {
  const weights = level === 'red'
    ? [184, 184, 184, 187, 187]
    : level === 'yellow'
    ? [184, 184, 185, 186, 186]
    : [184, 183.5, 184, 183, 184];

  return (
    <div className="dc-dash">
      <SideNav />
      <div className="dc-dash-main" style={{ overflow: 'auto' }}>
        {/* breadcrumbs */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="row gap-2 text-mono" style={{ fontSize: 12, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>
            <span>PATIENTS</span><IconChevron size={12}/>
            <span>ROBERT CHEN</span><IconChevron size={12}/>
            <span style={{ color: 'var(--ink)' }}>OVERVIEW</span>
          </div>
          <div className="row gap-2">
            <button className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}>
              <IconDownload size={14}/> Pre-visit summary
            </button>
            <button className="dc-btn dc-btn-ghost" style={{ padding: '8px 14px', fontSize: 13, background: 'var(--surface)' }}>
              <IconSettings size={14}/>
            </button>
          </div>
        </div>

        <StatusHeadline level={level} />

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 28 }}>
          <Stat label="Weight today"
            value={level === 'red' ? '187 lb' : level === 'yellow' ? '186 lb' : '184 lb'}
            sub={level === 'red' ? '+3 lb · 24 h' : level === 'yellow' ? '+2 lb · 24 h' : 'baseline'}
            tone={level === 'red' ? 'danger' : level === 'yellow' ? 'warn' : 'good'} />
          <Stat label="Adherence · 7 d" value="94%" sub="2 doses missed" tone="good" />
          <Stat label="Breathing"
            value={level === 'green' ? 'Clear' : 'Tight'}
            sub={level === 'green' ? 'no change' : 'on exertion · new'}
            tone={level === 'green' ? 'good' : 'warn'} />
          <Stat label="Next clinic" value="May 02" sub="Day 7 · Cardiology" />
        </div>

        {/* main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginTop: 22 }}>
          {/* weight chart */}
          <div className="dc-card" style={{ padding: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="dc-h-eyebrow">Weight trend · last 30 days</div>
                <div className="text-serif" style={{ fontSize: 24, marginTop: 4 }}>
                  {level === 'red' ? '+3 lb in 24 hours · ' : ''}
                  <span style={{ color: 'var(--ink-3)' }}>baseline 184 lb</span>
                </div>
              </div>
              <div className="row gap-1">
                {['7D','14D','30D'].map((s, i) => (
                  <div key={s} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: i === 0 ? 'var(--ink)' : 'transparent', color: i === 0 ? 'var(--bg)' : 'var(--ink-3)' }}>{s}</div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 18, position: 'relative' }}>
              <BigChart level={level} />
            </div>
          </div>

          {/* today */}
          <div className="dc-card" style={{ padding: 20 }}>
            <div className="dc-h-eyebrow">Today · April 25</div>
            <div className="col gap-3" style={{ marginTop: 12 }}>
              {[
                { t: '8:04 AM', l: 'Morning check-in', s: level === 'green' ? 'All green · 4/4 answered' : '4/4 answered · weight + breathing flagged', tone: level === 'green' ? 'green' : 'yellow', ic: <IconWave size={14}/> },
                { t: '8:14 AM', l: 'Furosemide 40 mg', s: 'Taken · 14 min late', tone: 'green', ic: <IconPill size={14}/> },
                { t: '8:14 AM', l: 'Metoprolol 25 mg', s: 'Taken on time', tone: 'green', ic: <IconPill size={14}/> },
                { t: '8:00 PM', l: 'Evening check-in', s: 'Scheduled', tone: 'neutral', ic: <IconBell size={14}/> },
                { t: '8:00 PM', l: 'Evening meds (2)', s: 'Scheduled', tone: 'neutral', ic: <IconPill size={14}/> },
              ].map((it, i, arr) => (
                <div key={i} className="row gap-3" style={{ alignItems: 'flex-start', paddingBottom: 12, borderBottom: i < arr.length-1 ? '1px solid var(--hairline)' : 'none' }}>
                  <div className="text-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', width: 56, flexShrink: 0, paddingTop: 3 }}>{it.t}</div>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: it.tone === 'neutral' ? 'transparent' : it.tone === 'green' ? 'var(--accent-soft)' : 'var(--warn-soft)', color: it.tone === 'green' ? 'var(--accent-ink)' : it.tone === 'yellow' ? 'var(--warn-ink)' : 'var(--ink-3)', border: it.tone === 'neutral' ? '1px dashed var(--hairline)' : 'none', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{it.ic}</div>
                  <div className="col flex-1" style={{ gap: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{it.l}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{it.s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* lower row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20, marginTop: 20 }}>
          <div className="dc-card" style={{ padding: 0 }}>
            <div style={{ padding: '18px 20px 12px' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="dc-h-eyebrow">Alert history</div>
                <span className="dc-tag">{level === 'red' ? '2 active' : level === 'yellow' ? '1 active' : 'all clear'}</span>
              </div>
            </div>
            {(level === 'red' ? [
              { t: '9:04 AM', l: 'Red flag · weight + new SOB', s: 'SMS sent to Sarah · cardiology offered', tone: 'red' },
              { t: '8:04 AM', l: 'Weight gain 3 lb in 24 h', s: 'Threshold: > 2 lb / 24 h', tone: 'yellow' },
              { t: 'Day 2', l: 'Missed evening Furosemide', s: 'Resolved · taken at 9:42 PM', tone: 'yellow', resolved: true },
            ] : level === 'yellow' ? [
              { t: '8:04 AM', l: 'Weight gain 2 lb in 24 h', s: 'Watch · re-check tomorrow AM', tone: 'yellow' },
              { t: 'Day 2', l: 'Missed evening Furosemide', s: 'Resolved · taken at 9:42 PM', tone: 'yellow', resolved: true },
            ] : [
              { t: 'Day 2', l: 'Missed evening Furosemide', s: 'Resolved · taken at 9:42 PM', tone: 'yellow', resolved: true },
            ]).map((a, i) => (
              <div key={i} className="row gap-3" style={{ padding: '14px 20px', borderTop: '1px solid var(--hairline)', alignItems: 'center' }}>
                <span className={`dc-pill ${a.tone}`}><div className="dot"/>{a.tone}</span>
                <div className="col flex-1" style={{ gap: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, textDecoration: a.resolved ? 'line-through' : 'none', color: a.resolved ? 'var(--ink-3)' : 'inherit' }}>{a.l}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{a.s}</span>
                </div>
                <span className="text-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.t}</span>
                <IconChevron size={14} style={{ color: 'var(--ink-3)' }}/>
              </div>
            ))}
          </div>

          {/* regimen */}
          <div className="dc-card" style={{ padding: 20 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="dc-h-eyebrow">Active regimen · 8 meds</div>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>View all</span>
            </div>
            <div className="col" style={{ marginTop: 10 }}>
              {[
                { n: 'Furosemide', d: '40 mg · 2× daily', t: 'diuretic' },
                { n: 'Metoprolol', d: '25 mg · daily', t: 'beta-blocker' },
                { n: 'Lisinopril', d: '10 mg · daily', t: 'ACE' },
                { n: 'Spironolactone', d: '25 mg · daily', t: 'k-spare' },
              ].map((m, i, arr) => (
                <div key={i} className="row" style={{ padding: '11px 0', borderBottom: i < arr.length-1 ? '1px solid var(--hairline)' : 'none', justifyContent: 'space-between' }}>
                  <div className="col" style={{ gap: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{m.n}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.d}</span>
                  </div>
                  <span className="dc-tag">{m.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BigChart = ({ level }) => {
  const w = 540, h = 180, pad = 24;
  const days = 30;
  const data = Array.from({ length: days }, (_, i) => {
    if (level === 'red') {
      if (i < 3) return 184 + Math.sin(i)*0.4;
      if (i === 3) return 187;
      return 187 + Math.sin(i*0.5)*0.5;
    }
    if (level === 'yellow') {
      if (i < 2) return 184;
      if (i === 2) return 185;
      if (i === 3) return 186;
      return null;
    }
    return 184 + Math.sin(i*0.6)*0.6;
  });
  const filled = data.filter(d => d != null);
  const min = 180, max = 192;
  const sx = (i) => pad + (i / (days - 1)) * (w - pad * 2);
  const sy = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  let path = '';
  data.forEach((v, i) => { if (v != null) path += `${path ? 'L' : 'M'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)} `; });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {/* threshold band */}
      <rect x={pad} y={sy(186)} width={w - pad*2} height={sy(184) - sy(186)} fill="color-mix(in srgb, var(--accent) 8%, transparent)" />
      <line x1={pad} x2={w-pad} y1={sy(186)} y2={sy(186)} stroke="var(--warn)" strokeDasharray="3 4" strokeWidth="1"/>
      <line x1={pad} x2={w-pad} y1={sy(189)} y2={sy(189)} stroke="var(--danger)" strokeDasharray="3 4" strokeWidth="1"/>
      <text x={w-pad-2} y={sy(189)-4} fontSize="10" textAnchor="end" fill="var(--danger-ink)" fontFamily="var(--font-mono)">+5 LB · RED</text>
      <text x={w-pad-2} y={sy(186)-4} fontSize="10" textAnchor="end" fill="var(--warn-ink)" fontFamily="var(--font-mono)">+2 LB · YELLOW</text>
      <text x={pad+2} y={sy(184)-4} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono)">BASELINE 184</text>
      <path d={path} fill="none" stroke={level === 'red' ? 'var(--danger)' : level === 'yellow' ? 'var(--warn-ink)' : 'var(--accent)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((v, i) => v != null && (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={i === filled.length - 1 ? 4 : 2}
          fill={i === filled.length - 1 ? (level === 'red' ? 'var(--danger)' : level === 'yellow' ? 'var(--warn-ink)' : 'var(--accent)') : '#fff'}
          stroke={level === 'red' ? 'var(--danger)' : level === 'yellow' ? 'var(--warn-ink)' : 'var(--accent)'} strokeWidth={i === filled.length - 1 ? 0 : 1.4}/>
      ))}
      {/* x ticks */}
      {[0, 6, 13, 20, 29].map(i => (
        <text key={i} x={sx(i)} y={h-4} fontSize="10" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--font-mono)">D{i+1}</text>
      ))}
    </svg>
  );
};

// Alert detail (modal-style overlay on dashboard)
const ScreenAlertDetail = () => (
  <div style={{ position: 'relative', width: '100%', height: '100%', background: 'rgba(26,31,27,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
    <div style={{ position: 'absolute', inset: 0, opacity: 0.4, filter: 'blur(2px)' }}>
      <DashboardCommon level="red" />
    </div>
    <div style={{ position: 'relative', width: 520, maxHeight: '90%', background: 'var(--bg-elev)', border: '1px solid var(--hairline)', borderRadius: 20, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '22px 26px 18px', borderBottom: '1px solid var(--hairline)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="dc-pill red"><div className="dot"/>Red flag · 9:04 AM</span>
          <IconClose size={18} style={{ color: 'var(--ink-3)' }}/>
        </div>
        <h2 className="text-serif" style={{ fontSize: 26, lineHeight: 1.15, margin: '14px 0 0', letterSpacing: '-0.005em' }}>
          Day 4 · weight up 3 lb and new shortness of breath.
        </h2>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Pattern matches early CHF decompensation. American Heart Association threshold: weight gain {`>`} 2 lb in 24 h plus a new symptom.
        </p>
      </div>

      <div style={{ padding: '18px 26px' }}>
        <div className="dc-h-eyebrow">What we did automatically</div>
        <div className="col gap-2" style={{ marginTop: 10 }}>
          {[
            { ic: <IconCheck size={14}/>, t: 'SMS sent to you', s: '+1 (310) 555-1234 · 9:04 AM' },
            { ic: <IconCheck size={14}/>, t: 'Pre-appointment summary drafted', s: 'Ready to send to Dr. Patel' },
            { ic: <IconCheck size={14}/>, t: 'Same-day cardiology appointment offered', s: 'Awaiting Dad\'s confirmation' },
          ].map((a, i) => (
            <div key={i} className="row gap-2" style={{ alignItems: 'center', padding: '8px 12px', background: 'var(--accent-soft)', borderRadius: 10 }}>
              <div style={{ color: 'var(--accent-ink)' }}>{a.ic}</div>
              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{a.t}</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)', marginLeft: 'auto' }}>{a.s}</span>
            </div>
          ))}
        </div>

        <div className="dc-h-eyebrow" style={{ marginTop: 18 }}>Heard from Dad · transcript</div>
        <div className="dc-soft-card" style={{ marginTop: 8, padding: 14 }}>
          <p className="text-serif" style={{ margin: 0, fontSize: 16, lineHeight: 1.4, color: 'var(--ink-2)' }}>
            "I weighed one-eighty-seven this morning. Breathing's a <em>little</em> tight, walking to the kitchen. Took my pills, yeah."
          </p>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>8:03 AM · ON-DEVICE WHISPER · 96% CONFIDENCE</div>
        </div>
      </div>

      <div style={{ padding: '14px 26px 22px', borderTop: '1px solid var(--hairline)', display: 'flex', gap: 8 }}>
        <button className="dc-btn dc-btn-ghost" style={{ flex: 1, background: 'var(--surface)' }}>Mark as resolved</button>
        <button className="dc-btn dc-btn-primary" style={{ flex: 1.4 }}>
          <IconPhone size={14}/> Call Dad now
        </button>
      </div>
    </div>
  </div>
);

const ScreenTimeWarp = () => (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <DashboardCommon level="green" />
    <div style={{ position: 'absolute', right: 24, bottom: 24, width: 320, background: '#0E120F', color: '#F2EEE3', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-lg)', border: '1px solid rgba(242,238,227,0.1)' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(242,238,227,0.08)', display: 'grid', placeItems: 'center' }}>
            <IconSpark size={14}/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Time-warp demo</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(242,238,227,0.5)' }}>v1.0 · 3-tap unlocked</span>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'rgba(242,238,227,0.7)' }}>
        Replays days 1–7 in 60 seconds. Voice, escalation, and dashboard fire as if real-time. Day 4 red flag is scripted.
      </p>

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < 4 ? 'var(--accent)' : 'rgba(242,238,227,0.15)' }}/>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8, justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(242,238,227,0.5)' }}>
        <span>DAY 4 / 7</span>
        <span>00:34 / 01:00</span>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <button style={{ flex: 1, padding: '10px 12px', borderRadius: 999, background: 'rgba(242,238,227,0.1)', color: '#F2EEE3', border: '1px solid rgba(242,238,227,0.18)', fontSize: 13, fontFamily: 'inherit' }}>Reset</button>
        <button style={{ flex: 2, padding: '10px 12px', borderRadius: 999, background: '#F2EEE3', color: '#0E120F', border: 'none', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }}>Pause warp</button>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  DashboardCommon, ScreenAlertDetail, ScreenTimeWarp, Sparkline
});
