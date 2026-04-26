import { useDashboard } from '../useDashboard';

const SEVERITY_COLOR: Record<string, string> = { moderate: '#c8843a', major: '#b2492b', contraindicated: '#7a1e0a' };

export function MedicationsPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;

  const meds = data?.regimen?.medications ?? [];
  const interactions = data?.regimen?.interactions ?? [];

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {(data?.patient?.patientName ?? '—').toUpperCase()} / MEDICATIONS</div>
      </header>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <h3>Active regimen · {meds.length} medications</h3>
        {meds.length === 0 && <p className="subtle" style={{ marginTop: 8 }}>No regimen extracted yet.</p>}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {meds.map((m, i) => (
            <div key={i} style={{ padding: '14px 16px', background: '#faf8f4', borderRadius: 8, border: '1px solid #e4dfd3' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{m.drugName}</span>
                  <span style={{ marginLeft: 10, color: '#6b716c' }}>{m.dose} · {m.frequency}</span>
                </div>
                <span style={{ fontSize: 12, color: '#6b716c', background: '#ede8df', borderRadius: 4, padding: '2px 8px' }}>{m.duration}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: '#6b716c', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {m.schedule?.length > 0 && <span>⏰ {m.schedule.join(', ')}</span>}
                {m.instructions && <span>💊 {m.instructions}</span>}
                {m.indication && <span>· {m.indication}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {interactions.length > 0 && (
        <section className="dc-card">
          <h3>Drug interactions · {interactions.length} flagged</h3>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {interactions.map((ix, i) => (
              <div key={i} style={{ padding: '12px 14px', borderLeft: `4px solid ${SEVERITY_COLOR[ix.severity] ?? '#6b716c'}`, background: '#faf8f4', borderRadius: '0 8px 8px 0' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {ix.drugs.join(' + ')}
                  <span style={{ marginLeft: 8, fontSize: 12, color: SEVERITY_COLOR[ix.severity], textTransform: 'uppercase' }}>{ix.severity}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>{ix.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
