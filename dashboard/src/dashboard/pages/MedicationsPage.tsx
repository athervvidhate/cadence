import { useDashboardData } from '../DashboardDataContext';

export function MedicationsPage() {
  const { data, error, isLoading } = useDashboardData();
  const medications = data?.regimen.medications ?? [];
  const interactions = data?.regimen.interactions ?? [];

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {data?.patient.patientName.toUpperCase() ?? 'LOADING'} / MEDICATIONS</div>
        <div className="row gap-2">
          <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Print regimen</button>
          <button className="dc-btn dc-btn-primary" style={{ fontSize: 13 }}>Add medication</button>
        </div>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>{medications.length} active</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Daily regimen
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Reconciled medication data from the latest regimen extraction.
        </p>
      </div>

      {isLoading && <section className="dc-card">Loading medications...</section>}
      {error && <section className="dc-card">Could not load medications: {error.message}</section>}

      <section className="dc-card" style={{ padding: 0 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr',
          padding: '12px 18px', borderBottom: '1px solid var(--hairline)',
          fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          <span>Drug</span><span>Dose</span><span>Schedule</span><span>Instructions</span>
        </div>
        {medications.map((medication, index) => (
          <div key={`${medication.drugName}-${medication.dose}`} style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr',
            padding: '14px 18px', alignItems: 'center',
            borderBottom: index < medications.length - 1 ? '1px solid var(--hairline)' : 'none',
          }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{medication.drugName}</span>
            <span style={{ fontSize: 13 }}>{medication.dose}</span>
            <span style={{ fontSize: 13 }}>{medication.frequency}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{medication.instructions ?? medication.indication ?? 'No instructions recorded'}</span>
          </div>
        ))}
        {data && medications.length === 0 && <div style={{ padding: 18 }}>No medications extracted yet.</div>}
      </section>

      {interactions.length > 0 && (
        <section className="dc-card">
          <div className="dc-h-eyebrow">Interactions monitored</div>
          <ul className="simple-list" style={{ marginTop: 10 }}>
            {interactions.map((interaction) => (
              <li key={`${interaction.severity}-${interaction.drugs.join('-')}`}>
                {interaction.severity}: {interaction.drugs.join(' + ')} · {interaction.note}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
