// Voice cloning + check-in screens

const ScreenVoiceRecord = () => (
  <div className="dc-phone">
    <Topbar left={<IconChevronL size={20} />} right={<span className="dc-link">Why?</span>} step={3} total={5} />
    <div className="dc-phone-scroll" style={{ padding: '8px 24px 16px' }}>
      <span className="dc-h-eyebrow">Step 4 · Record your voice</span>
      <h1 className="dc-h1-small" style={{ marginTop: 10 }}>Read this aloud, just once.</h1>
      <p className="dc-h-sub" style={{ marginTop: 8 }}>30 seconds is all we need. Dad will hear <em>your</em> voice on every check-in.</p>

      {/* script card */}
      <div className="dc-soft-card" style={{ marginTop: 18, padding: '20px 18px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 12, right: 14 }}>
          <span className="dc-tag">script · 28 sec</span>
        </div>
        <p className="text-serif" style={{ fontSize: 19, lineHeight: 1.4, color: 'var(--ink)', margin: 0 }}>
          "Hi Dad, it's Sarah. I just wanted to check in this morning. I love you, and I'm right here if you need me. Let's take this one day at a time."
        </p>
      </div>

      {/* waveform */}
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: 84 }}>
        {Array.from({ length: 38 }).map((_, i) => {
          const seed = Math.sin(i * 1.7) * 0.5 + 0.5;
          const noise = Math.sin(i * 0.4) * 0.4 + 0.6;
          const h = Math.max(8, seed * noise * 84);
          const active = i < 22;
          return <div key={i} style={{ width: 4, height: h, borderRadius: 2, background: active ? 'var(--accent)' : 'var(--hairline)' }} />;
        })}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 14 }}>
        <span className="text-mono" style={{ fontSize: 13, color: 'var(--ink-2)' }}>00:18</span>
        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>/ 00:30</span>
      </div>

      <div style={{ marginTop: 30, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <IconShield size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
        Your audio is encrypted and only used to clone your voice.
      </div>
    </div>

    <div style={{ padding: '14px 20px 28px', background: 'var(--bg-elev)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <button className="dc-btn dc-btn-ghost" style={{ width: 48, height: 48, padding: 0, borderRadius: 24 }}>
        <IconClose size={18} />
      </button>
      <div style={{ width: 78, height: 78, borderRadius: 40, background: 'var(--danger)', boxShadow: '0 0 0 6px color-mix(in srgb, var(--danger) 22%, transparent)', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 26, height: 26, background: '#F2EEE3', borderRadius: 6 }} />
      </div>
      <button className="dc-btn dc-btn-ghost" style={{ width: 48, height: 48, padding: 0, borderRadius: 24 }}>
        <IconCheck size={18} />
      </button>
    </div>
  </div>
);

const ScreenVoiceConfirm = () => (
  <div className="dc-phone">
    <Topbar left={<IconChevronL size={20} />} step={3} total={5} />
    <div className="dc-phone-scroll" style={{ padding: '8px 24px 16px' }}>
      <span className="dc-h-eyebrow">Step 4 · Voice ready</span>
      <h1 className="dc-h1-small" style={{ marginTop: 10 }}>Here's how Dad will hear you.</h1>
      <p className="dc-h-sub" style={{ marginTop: 8 }}>Tap to play. If it doesn't sound right, you can re-record.</p>

      <div style={{ marginTop: 22, padding: '22px 18px', borderRadius: 18, background: 'linear-gradient(180deg, var(--surface), var(--bg-elev))', border: '1px solid var(--hairline)' }}>
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: 'var(--ink)', color: 'var(--bg-elev)', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 0, height: 0, borderLeft: '12px solid currentColor', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }}/>
          </div>
          <div className="col flex-1">
            <span style={{ fontSize: 15, fontWeight: 500 }}>"Good morning, Dad. It's day 4."</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Sarah's voice · cloned</span>
          </div>
          <span className="text-mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>0:04</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2.5, height: 36 }}>
          {Array.from({ length: 64 }).map((_, i) => {
            const h = Math.max(3, (Math.sin(i*0.6)*0.4 + Math.sin(i*0.13)*0.5 + 0.6) * 32);
            return <div key={i} style={{ width: 2.5, height: h, borderRadius: 1.5, background: i < 16 ? 'var(--accent)' : 'var(--hairline)' }}/>;
          })}
        </div>
      </div>

      <div className="col gap-3" style={{ marginTop: 20 }}>
        <div className="dc-card" style={{ padding: '14px 16px' }} className="dc-card row gap-3">
          <IconCheck size={18} style={{ color: 'var(--accent-ink)' }} />
          <div className="col" style={{ gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Voice clone created</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Stored on this device · 4.2 MB</span>
          </div>
        </div>
      </div>
    </div>
    <PrimaryFooter>
      <div className="row gap-2">
        <button className="dc-btn dc-btn-ghost" style={{ flex: 1 }}>Re-record</button>
        <button className="dc-btn dc-btn-primary" style={{ flex: 2 }}>Sounds great<IconChevron size={16} /></button>
      </div>
    </PrimaryFooter>
  </div>
);

const ScreenPlanReady = () => (
  <div className="dc-phone">
    <Topbar />
    <div className="dc-phone-scroll" style={{ padding: '20px 24px 16px' }}>
      <div style={{ marginTop: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}>
          <IconCheck size={24} />
        </div>
        <span className="dc-h-eyebrow" style={{ display: 'block', marginTop: 22 }}>30 days · 60 check-ins · ready</span>
        <h1 className="dc-h1" style={{ marginTop: 10 }}>Dad's plan is set.</h1>
        <p className="dc-h-sub" style={{ marginTop: 12 }}>
          The first check-in calls tomorrow morning at 8:00. We'll watch his weight, breathing, and meds — and ping you the moment something changes.
        </p>
      </div>

      <div className="dc-card" style={{ marginTop: 24, padding: 0 }}>
        {[
          { ic: <IconBell size={16} />, t: 'Tomorrow 8:00 AM', s: 'First morning check-in (weight + breathing)' },
          { ic: <IconPill size={16} />, t: 'Tomorrow 8:00 AM', s: 'Furosemide + Metoprolol + 2 others' },
          { ic: <IconCal size={16} />, t: 'May 02 · Day 7', s: 'Cardiology with Dr. Patel' },
          { ic: <IconAlert size={16} />, t: 'Anytime', s: 'You get an SMS for any yellow or red flag' },
        ].map((it, i, arr) => (
          <div key={i} className="row gap-3" style={{ padding: '14px 16px', borderBottom: i < arr.length-1 ? '1px solid var(--hairline)' : 'none', alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-elev)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', flexShrink: 0 }}>
              {it.ic}
            </div>
            <div className="col flex-1" style={{ gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{it.t}</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{it.s}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
        Open the dashboard anytime at <span style={{ color: 'var(--ink)' }} className="text-mono">care.dischargecoach.app</span>
      </div>
    </div>
    <PrimaryFooter>
      <button className="dc-btn dc-btn-primary dc-btn-block">Hand the phone to Dad<IconChevron size={16} /></button>
    </PrimaryFooter>
  </div>
);

// ------- Patient: incoming check-in -------
const ScreenPatientIncoming = () => (
  <div className="dc-patient-screen">
    <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(242,238,227,0.6)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <span>8:02 AM · TUE</span>
      <span>DAY 4 OF 30</span>
    </div>

    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,238,227,0.55)' }}>Incoming check-in</span>
      <div className="dc-patient-greeting" style={{ marginTop: 14 }}>
        Sarah is calling.
      </div>
      <div style={{ fontSize: 22, lineHeight: 1.3, color: 'rgba(242,238,227,0.7)', marginTop: 14 }}>
        Good morning, Dad.<br/>Ready for our morning check-in?
      </div>

      <div style={{ marginTop: 50, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 84, height: 84, borderRadius: 42, background: 'rgba(242,238,227,0.08)', border: '1px solid rgba(242,238,227,0.18)', display: 'grid', placeItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px solid rgba(242,238,227,0.12)' }} />
          <div style={{ position: 'absolute', inset: -18, borderRadius: '50%', border: '1px solid rgba(242,238,227,0.06)' }} />
          <span className="text-serif" style={{ fontSize: 32, color: '#F2EEE3' }}>S</span>
        </div>
        <div className="col">
          <span style={{ fontSize: 18, fontWeight: 500 }}>Sarah</span>
          <span style={{ fontSize: 14, color: 'rgba(242,238,227,0.55)' }}>Daughter · DischargeCoach</span>
        </div>
      </div>
    </div>

    <div style={{ padding: '0 28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="col" style={{ alignItems: 'center', gap: 10 }}>
        <div style={{ width: 76, height: 76, borderRadius: 40, background: '#B53C2C', display: 'grid', placeItems: 'center' }}>
          <IconPhone size={28} style={{ color: '#F2EEE3', transform: 'rotate(135deg)' }} />
        </div>
        <span style={{ fontSize: 14, color: 'rgba(242,238,227,0.7)' }}>Later</span>
      </div>
      <div className="col" style={{ alignItems: 'center', gap: 10 }}>
        <div style={{ width: 76, height: 76, borderRadius: 40, background: 'oklch(0.55 0.16 145)', display: 'grid', placeItems: 'center', boxShadow: '0 0 0 8px rgba(80,170,110,0.18)' }}>
          <IconPhone size={28} style={{ color: '#F2EEE3' }} />
        </div>
        <span style={{ fontSize: 14, color: '#F2EEE3' }}>Answer</span>
      </div>
    </div>
  </div>
);

// ------- Patient: active check-in (listening) -------
const ScreenPatientCheckIn = () => (
  <div className="dc-patient-screen">
    <div style={{ padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(242,238,227,0.6)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <span className="row gap-2"><div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }}/>LIVE · 00:24</span>
      <span>WITH SARAH</span>
    </div>

    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 28px', gap: 18, justifyContent: 'flex-end' }}>
      {/* Sarah message */}
      <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(242,238,227,0.5)' }}>Sarah</span>
        <div className="text-serif" style={{ marginTop: 6, fontSize: 28, lineHeight: 1.2, color: '#F2EEE3' }}>
          How is your breathing this morning, Dad? Any tightness?
        </div>
      </div>

      {/* listening bubble */}
      <div style={{ alignSelf: 'flex-end', maxWidth: '90%', padding: '16px 18px', borderRadius: 22, background: 'rgba(242,238,227,0.08)', border: '1px solid rgba(242,238,227,0.14)' }}>
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(242,238,227,0.5)' }}>Listening</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 22, lineHeight: 1.3, color: '#F2EEE3', fontWeight: 300 }}>
          "A little, walking to the kitchen…"
        </div>
        {/* live waveform */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 3, height: 22 }}>
          {Array.from({ length: 40 }).map((_, i) => {
            const h = Math.max(3, (Math.sin(i*0.7)*0.5 + Math.sin(i*0.21)*0.5 + 0.6) * 22);
            return <div key={i} style={{ width: 2.5, height: h, borderRadius: 1.5, background: i < 28 ? '#F2EEE3' : 'rgba(242,238,227,0.25)' }}/>;
          })}
        </div>
      </div>
    </div>

    {/* progress dots through check-in */}
    <div style={{ padding: '0 28px 18px', display: 'flex', justifyContent: 'center', gap: 10 }}>
      {['Weight', 'Breathing', 'Swelling', 'Meds'].map((s, i) => (
        <div key={s} className="row gap-2" style={{ alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: i < 1 ? 'var(--accent)' : i === 1 ? '#F2EEE3' : 'rgba(242,238,227,0.2)' }}/>
          <span style={{ fontSize: 12, color: i <= 1 ? 'rgba(242,238,227,0.85)' : 'rgba(242,238,227,0.4)' }}>{s}</span>
        </div>
      ))}
    </div>

    <div style={{ padding: '0 28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <button style={{ background: 'rgba(242,238,227,0.08)', color: '#F2EEE3', border: '1px solid rgba(242,238,227,0.18)', padding: '14px 22px', borderRadius: 999, fontSize: 16, fontFamily: 'inherit' }}>
        Pause
      </button>
      <button style={{ background: '#B53C2C', color: '#F2EEE3', border: 'none', padding: '14px 26px', borderRadius: 999, fontSize: 16, fontWeight: 500, fontFamily: 'inherit' }}>
        End check-in
      </button>
    </div>
  </div>
);

// ------- Patient: complete + caution -------
const ScreenPatientComplete = () => (
  <div className="dc-patient-screen">
    <div style={{ padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(242,238,227,0.6)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <span>8:04 AM · TUE</span>
      <span>DAY 4 OF 30</span>
    </div>

    <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(255,180,80,0.18)', color: '#FFC97A', border: '1px solid rgba(255,180,80,0.4)', display: 'grid', placeItems: 'center' }}>
        <IconAlert size={22} />
      </div>
      <div className="dc-patient-greeting" style={{ marginTop: 22 }}>
        Thanks, Dad. I'm gonna call Sarah to check on you.
      </div>
      <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.45, color: 'rgba(242,238,227,0.7)' }}>
        Your weight is up <b style={{ color: '#F2EEE3' }}>3 pounds</b> from yesterday and your breathing is a little tight. Nothing scary — just want Sarah to know.
      </p>

      <div style={{ marginTop: 28, padding: 16, borderRadius: 16, background: 'rgba(242,238,227,0.06)', border: '1px solid rgba(242,238,227,0.12)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(242,238,227,0.55)' }}>Today so far</div>
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { l: 'Weight', v: '187 lb', d: '+3 lb', tone: '#FFC97A' },
            { l: 'Breathing', v: 'On exertion', d: 'New today', tone: '#FFC97A' },
            { l: 'Meds taken', v: '2 of 4', d: 'Morning round', tone: '#F2EEE3' },
            { l: 'Swelling', v: 'None', d: 'Same as day 3', tone: 'rgba(140,220,160,1)' },
          ].map(it => (
            <div key={it.l}>
              <div style={{ fontSize: 12, color: 'rgba(242,238,227,0.5)' }}>{it.l}</div>
              <div className="text-serif" style={{ fontSize: 22, color: '#F2EEE3', marginTop: 2 }}>{it.v}</div>
              <div style={{ fontSize: 12, color: it.tone }}>{it.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{ padding: '8px 28px 36px' }}>
      <button style={{ width: '100%', background: '#F2EEE3', color: '#0E120F', padding: 18, borderRadius: 999, fontSize: 17, fontWeight: 500, border: 'none', fontFamily: 'inherit' }}>
        Okay, talk soon
      </button>
    </div>
  </div>
);

Object.assign(window, {
  ScreenVoiceRecord, ScreenVoiceConfirm, ScreenPlanReady,
  ScreenPatientIncoming, ScreenPatientCheckIn, ScreenPatientComplete
});
