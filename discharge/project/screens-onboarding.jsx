// Onboarding screens — caregiver perspective
// Each component returns content meant to fit inside <IOSFrame />

const StepDots = ({ active, total }) => (
  <div className="step-dots">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`step-dot ${i === active ? 'active' : i < active ? 'done' : ''}`}
      />
    ))}
  </div>
);

const Topbar = ({ left, right, step, total }) => (
  <div className="dc-appbar">
    <div style={{ minWidth: 56, display: 'flex', alignItems: 'center', gap: 6 }}>{left}</div>
    {step != null && <StepDots active={step} total={total} />}
    <div style={{ minWidth: 56, textAlign: 'right' }}>{right}</div>
  </div>
);

const PrimaryFooter = ({ children }) => (
  <div style={{ padding: '14px 20px 28px', borderTop: '1px solid var(--hairline)', background: 'var(--bg-elev)' }}>
    {children}
  </div>
);

// ------- 1. Welcome -------
const ScreenWelcome = () => (
  <div className="dc-phone" style={{ background: 'var(--bg)' }}>
    <Topbar />
    <div className="dc-phone-scroll" style={{ padding: '20px 24px 16px', display: 'flex', flexDirection: 'column' }}>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center' }}>
          <IconHeart size={14} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>DischargeCoach</span>
      </div>

      <div style={{ marginTop: 64 }}>
        <span className="dc-h-eyebrow">Set up · 2 minutes</span>
        <h1 className="dc-h1" style={{ marginTop: 14, fontSize: 36 }}>
          The next 30 days, <em style={{ fontStyle: 'italic', color: 'var(--accent-ink)' }}>handled</em> together.
        </h1>
        <p className="dc-h-sub" style={{ marginTop: 14, fontSize: 16 }}>
          DischargeCoach turns the discharge paperwork into a daily plan and checks in twice a day — in your voice, so Dad always recognizes who's calling.
        </p>
      </div>

      <div className="col gap-3" style={{ marginTop: 36 }}>
        {[
          { ic: <IconCamera size={16} />, t: 'Snap the paperwork', s: 'We extract meds, doses, and follow-ups.' },
          { ic: <IconMic size={16} />, t: 'Record 30s of your voice', s: "Dad will hear you on every check-in." },
          { ic: <IconShield size={16} />, t: 'Stays on this phone', s: 'Photos and voice never leave the device.' },
        ].map((it, i) => (
          <div key={i} className="row gap-3" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', background: 'var(--surface)', flexShrink: 0 }}>
              {it.ic}
            </div>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{it.t}</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>{it.s}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    <PrimaryFooter>
      <button className="dc-btn dc-btn-primary dc-btn-block">Begin setup<IconChevron size={16} /></button>
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--ink-3)' }}>
        Already set up? <span style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}>Sign in</span>
      </div>
    </PrimaryFooter>
  </div>
);

// ------- 2. Patient profile -------
const ScreenProfile = () => (
  <div className="dc-phone">
    <Topbar left={<IconChevronL size={20} />} right={<span className="dc-link">Skip</span>} step={0} total={5} />
    <div className="dc-phone-scroll" style={{ padding: '8px 24px 16px' }}>
      <span className="dc-h-eyebrow">Step 1 · About the patient</span>
      <h1 className="dc-h1-small" style={{ marginTop: 10 }}>Who are we caring for?</h1>
      <p className="dc-h-sub" style={{ marginTop: 8 }}>We'll use this to personalize check-ins.</p>

      <div className="col gap-4" style={{ marginTop: 22 }}>
        <div className="dc-field">
          <label className="dc-label">Full name</label>
          <input className="dc-input" defaultValue="Robert Chen" />
        </div>
        <div className="dc-field">
          <label className="dc-label">What you call them</label>
          <input className="dc-input" defaultValue="Dad" />
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Used in voice prompts: "Good morning, Dad."</span>
        </div>
        <div className="row gap-3">
          <div className="dc-field" style={{ flex: 1 }}>
            <label className="dc-label">Age</label>
            <input className="dc-input" defaultValue="76" />
          </div>
          <div className="dc-field" style={{ flex: 1 }}>
            <label className="dc-label">Baseline weight</label>
            <input className="dc-input" defaultValue="184 lb" />
          </div>
        </div>
        <div className="dc-field">
          <label className="dc-label">Preferred language</label>
          <div className="row gap-2">
            {['English', 'Español'].map((l, i) => (
              <div key={l} style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, fontSize: 15,
                border: i === 0 ? '1.5px solid var(--ink)' : '1px solid var(--hairline)',
                background: i === 0 ? 'var(--surface)' : 'transparent',
                fontWeight: i === 0 ? 500 : 400,
                textAlign: 'center'
              }}>{l}</div>
            ))}
          </div>
        </div>
        <div className="dc-soft-card" style={{ padding: 14, display: 'flex', gap: 10 }}>
          <IconShield size={18} style={{ color: 'var(--accent-ink)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
            Diagnosis confirmed as <b>Congestive Heart Failure</b> from your discharge paperwork.
          </div>
        </div>
      </div>
    </div>
    <PrimaryFooter>
      <button className="dc-btn dc-btn-primary dc-btn-block">Continue<IconChevron size={16} /></button>
    </PrimaryFooter>
  </div>
);

// ------- 3. Discharge capture -------
const ScreenDischargeCapture = () => (
  <div className="dc-phone" style={{ background: '#0E120F', color: '#F2EEE3' }}>
    {/* faux camera viewfinder */}
    <div style={{
      position: 'absolute', inset: 0,
      backgroundImage: 'radial-gradient(120% 70% at 50% 30%, rgba(255,255,255,0.04), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 6px)',
      pointerEvents: 'none'
    }} />
    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, color: '#F2EEE3' }}>
      <IconClose size={22} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>Discharge paper · pg 2 of 4</div>
      <IconBell size={20} style={{ opacity: 0 }}/>
    </div>

    {/* faux paper */}
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', position: 'relative', zIndex: 2 }}>
      <div style={{
        width: '78%', aspectRatio: '0.74', background: '#F4EFE3',
        borderRadius: 6,
        boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
        padding: '18px 16px',
        color: '#1A1F1B',
        transform: 'perspective(900px) rotateX(2deg) rotateY(-2deg)',
        position: 'relative'
      }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12 }}>UCLA Health · After-Visit Summary</div>
        <div style={{ fontSize: 10, color: '#6B716C', marginTop: 2 }}>CHEN, ROBERT · DOB 03/14/1949 · MRN 4419302</div>
        <div style={{ marginTop: 10, fontSize: 9.5, lineHeight: 1.45, color: '#3B413C' }}>
          <div style={{ fontWeight: 600, marginTop: 4 }}>Medications</div>
          <div>· Furosemide 40 mg · Take twice daily with food</div>
          <div>· Metoprolol 25 mg · Take once daily in morning</div>
          <div>· Lisinopril 10 mg · Take once daily</div>
          <div>· Spironolactone 25 mg · Take once daily</div>
          <div style={{ fontWeight: 600, marginTop: 6 }}>Daily monitoring</div>
          <div>· Weigh yourself every morning before breakfast</div>
          <div>· Call doctor if weight gain {`>`} 2 lb / 24 hrs</div>
          <div style={{ fontWeight: 600, marginTop: 6 }}>Follow-up</div>
          <div>· Cardiology — Day 7 · Dr. Patel</div>
          <div>· Primary care — Day 14</div>
        </div>
      </div>

      {/* corner brackets */}
      {[
        { top: 70, left: 36 }, { top: 70, right: 36 },
        { bottom: 110, left: 36 }, { bottom: 110, right: 36 },
      ].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', width: 22, height: 22,
          borderTop: i < 2 ? '2px solid #F2EEE3' : 'none',
          borderBottom: i >= 2 ? '2px solid #F2EEE3' : 'none',
          borderLeft: (i % 2 === 0) ? '2px solid #F2EEE3' : 'none',
          borderRight: (i % 2 === 1) ? '2px solid #F2EEE3' : 'none',
          ...s
        }} />
      ))}
    </div>

    {/* thumbnail strip */}
    <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, position: 'relative', zIndex: 2 }}>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} style={{
          width: 46, height: 60, borderRadius: 6,
          background: n <= 2 ? '#F4EFE3' : 'rgba(255,255,255,0.08)',
          border: n === 2 ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.18)',
          display: 'grid', placeItems: 'center',
          fontSize: 11, color: n <= 2 ? '#3B413C' : 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-mono)'
        }}>
          {n <= 2 ? `pg ${n}` : ''}
        </div>
      ))}
      <div style={{ flex: 1 }}/>
      <div style={{ alignSelf: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Auto-crop on</div>
    </div>

    {/* shutter */}
    <div style={{ padding: '12px 24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
      <div style={{ width: 56, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Retake</div>
      <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #F2EEE3', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F2EEE3' }} />
      </div>
      <div style={{ width: 56, fontSize: 14, color: '#F2EEE3', fontWeight: 500, textAlign: 'right' }}>Done</div>
    </div>
  </div>
);

// ------- 4. Bottle scan -------
const ScreenBottleScan = () => (
  <div className="dc-phone" style={{ background: '#0E120F', color: '#F2EEE3' }}>
    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <IconClose size={22} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>Medication 3 of 8</div>
      <span style={{ fontSize: 14, opacity: 0.8 }}>?</span>
    </div>

    <div style={{ flex: 1, position: 'relative', display: 'grid', placeItems: 'center' }}>
      {/* viewfinder */}
      <div style={{
        position: 'absolute', inset: '20% 14%',
        border: '1.5px dashed rgba(255,255,255,0.35)', borderRadius: 16,
      }} />
      {/* pill bottle */}
      <div style={{ width: 130, height: 200, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 28, background: '#D6CFBF', borderRadius: '6px 6px 2px 2px' }} />
        <div style={{ position: 'absolute', top: 26, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, #E8B96E, #C58B3F)', borderRadius: '4px 4px 14px 14px' }}>
          <div style={{ position: 'absolute', top: 18, left: 8, right: 8, bottom: 18, background: '#F4EFE3', borderRadius: 3, padding: '8px 6px', color: '#1A1F1B', fontSize: 8, lineHeight: 1.3 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 10 }}>RX 5512094</div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>FUROSEMIDE 40 MG</div>
            <div style={{ marginTop: 2 }}>Take 1 tab by mouth twice daily</div>
            <div style={{ marginTop: 4, color: '#6B716C', fontSize: 7 }}>CHEN, ROBERT · 60 tablets</div>
          </div>
        </div>
      </div>

      {/* scanned chip */}
      <div style={{ position: 'absolute', bottom: '24%', display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.92)', color: '#1A1F1B', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }} />
        Reading label · Furosemide 40 mg
      </div>
    </div>

    <div style={{ padding: '12px 20px 14px', display: 'flex', gap: 8, overflowX: 'auto' }}>
      {[
        { name: 'Lisinopril', ok: true },
        { name: 'Metoprolol', ok: true },
        { name: 'Furosemide', ok: 'live' },
        { name: 'Spironolactone' },
        { name: 'Potassium Cl' },
      ].map((m, i) => (
        <div key={i} style={{
          padding: '7px 11px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap',
          background: m.ok === 'live' ? 'var(--accent)' : m.ok ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
          color: m.ok === 'live' ? '#0E120F' : m.ok ? '#F2EEE3' : 'rgba(255,255,255,0.45)',
          fontWeight: m.ok === 'live' ? 600 : 400,
          border: m.ok ? 'none' : '1px dashed rgba(255,255,255,0.18)'
        }}>
          {m.ok && m.ok !== 'live' && <span style={{ marginRight: 5 }}>✓</span>}{m.name}
        </div>
      ))}
    </div>

    <div style={{ padding: '8px 24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ width: 60, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Retake</div>
      <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid #F2EEE3', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F2EEE3' }} />
      </div>
      <div style={{ width: 60, fontSize: 14, color: '#F2EEE3', fontWeight: 500, textAlign: 'right' }}>Done</div>
    </div>
  </div>
);

// ------- 5. Regimen review -------
const Med = ({ name, dose, freq, schedule, tag }) => (
  <div style={{ padding: '14px 14px', borderBottom: '1px solid var(--hairline)' }}>
    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div className="col">
        <div className="row gap-2" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 15.5, fontWeight: 500 }}>{name}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{dose}</span>
        </div>
        <span style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{freq} · {schedule}</span>
      </div>
      {tag}
    </div>
  </div>
);

const ScreenRegimen = () => (
  <div className="dc-phone">
    <Topbar left={<IconChevronL size={20} />} right={<span className="dc-link">Edit</span>} step={2} total={5} />
    <div className="dc-phone-scroll" style={{ padding: '8px 20px 20px' }}>
      <span className="dc-h-eyebrow">Step 3 · Review the plan</span>
      <h1 className="dc-h1-small" style={{ marginTop: 10 }}>We found <em style={{ fontStyle: 'italic' }}>8 medications</em> and 2 follow-ups.</h1>

      <div className="row gap-2" style={{ marginTop: 14 }}>
        <span className="dc-tag"><div style={{ width: 5, height: 5, borderRadius: 3, background: 'var(--accent)' }}/> 91% confidence</span>
        <span className="dc-tag">on-device · zetic</span>
      </div>

      {/* Discrepancy callout */}
      <div style={{
        marginTop: 16, padding: 14,
        background: 'var(--warn-soft)',
        border: '1px solid color-mix(in srgb, var(--warn) 30%, transparent)',
        borderRadius: 14
      }}>
        <div className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <IconAlert size={18} style={{ color: 'var(--warn-ink)', flexShrink: 0, marginTop: 1 }}/>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--warn-ink)' }}>1 discrepancy needs review</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
              <b>Metoprolol:</b> the discharge paper says <b>25 mg</b>, but the bottle is labeled <b>50 mg</b>. Confirm with pharmacy before next dose.
            </div>
            <div className="row gap-2" style={{ marginTop: 6 }}>
              <button className="dc-btn dc-btn-ghost" style={{ padding: '8px 12px', fontSize: 13, background: 'var(--surface)' }}>Call pharmacy</button>
              <button className="dc-btn dc-btn-ghost" style={{ padding: '8px 12px', fontSize: 13, background: 'transparent', border: 'none', color: 'var(--ink-3)' }}>Trust the bottle</button>
            </div>
          </div>
        </div>
      </div>

      {/* Med list */}
      <div className="dc-card" style={{ padding: 0, marginTop: 14 }}>
        <Med name="Furosemide" dose="40 mg" freq="Twice daily" schedule="8:00 AM · 8:00 PM" tag={<span className="dc-pill green"><div className="dot"/>diuretic</span>} />
        <Med name="Metoprolol" dose="25 mg / 50 mg?" freq="Once daily" schedule="8:00 AM" tag={<span className="dc-pill yellow"><div className="dot"/>review</span>} />
        <Med name="Lisinopril" dose="10 mg" freq="Once daily" schedule="8:00 AM" tag={<span className="dc-pill neutral">ACE</span>} />
        <Med name="Spironolactone" dose="25 mg" freq="Once daily" schedule="8:00 AM" tag={<span className="dc-pill neutral">k-spare</span>} />
        <div style={{ padding: '12px 14px', textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>+ 4 more medications</div>
      </div>

      {/* Interactions */}
      <div style={{ marginTop: 16 }}>
        <div className="dc-h-eyebrow">Interactions checked</div>
        <div className="dc-card" style={{ marginTop: 8, padding: '12px 14px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="col" style={{ gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Furosemide + Lisinopril</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Monitor potassium · risk of hypotension</span>
            </div>
            <span className="dc-pill yellow"><div className="dot"/>moderate</span>
          </div>
        </div>
      </div>

      {/* Follow-ups */}
      <div style={{ marginTop: 16 }}>
        <div className="dc-h-eyebrow">Follow-up appointments</div>
        <div className="dc-card" style={{ marginTop: 8, padding: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }} className="row gap-3">
            <div style={{ width: 38, textAlign: 'center' }}>
              <div className="text-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>MAY</div>
              <div className="text-serif" style={{ fontSize: 22, lineHeight: 1 }}>02</div>
            </div>
            <div className="col flex-1">
              <span style={{ fontSize: 14, fontWeight: 500 }}>Cardiology · Dr. Patel</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Day 7 · 9:30 AM</span>
            </div>
          </div>
          <div style={{ padding: '12px 14px' }} className="row gap-3">
            <div style={{ width: 38, textAlign: 'center' }}>
              <div className="text-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>MAY</div>
              <div className="text-serif" style={{ fontSize: 22, lineHeight: 1 }}>09</div>
            </div>
            <div className="col flex-1">
              <span style={{ fontSize: 14, fontWeight: 500 }}>Primary care · Dr. Hashimoto</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Day 14 · 11:00 AM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <PrimaryFooter>
      <button className="dc-btn dc-btn-primary dc-btn-block">Looks right · continue<IconChevron size={16} /></button>
    </PrimaryFooter>
  </div>
);

Object.assign(window, {
  ScreenWelcome, ScreenProfile, ScreenDischargeCapture, ScreenBottleScan, ScreenRegimen,
  Topbar, PrimaryFooter, StepDots
});
