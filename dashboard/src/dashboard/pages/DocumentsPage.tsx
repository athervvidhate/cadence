import { useDashboard } from '../useDashboard';

export function DocumentsPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;

  const meds = data?.regimen?.medications ?? [];
  const interactions = data?.regimen?.interactions ?? [];
  const patientName = data?.patient?.patientName ?? '—';
  const dischargeDate = data?.patient?.dischargeDate
    ? new Date(data.patient.dischargeDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {patientName.toUpperCase()} / DOCUMENTS</div>
      </header>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <h3>Discharge summary</h3>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Patient', patientName],
            ['Diagnosis', 'Congestive Heart Failure (CHF)'],
            ['Discharge date', dischargeDate],
            ['Baseline weight', data?.patient?.baselineWeightLbs ? `${data.patient.baselineWeightLbs} lb` : '—'],
            ['Monitoring period', '30 days'],
            ['Caregiver', data?.patient?.caregiver?.name ?? '—'],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: '10px 14px', background: '#faf8f4', borderRadius: 8, border: '1px solid #e4dfd3' }}>
              <div className="subtle" style={{ fontSize: 11, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <h3>Extracted regimen</h3>
        <p className="subtle" style={{ fontSize: 12, marginTop: 4, marginBottom: 12 }}>
          Extracted via Gemma 3 vision model from discharge paperwork
        </p>
        {meds.length === 0
          ? <p className="subtle">No regimen extracted yet. Upload discharge papers from the mobile app.</p>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e4dfd3', textAlign: 'left' }}>
                  <th style={{ padding: '6px 10px', color: '#6b716c', fontWeight: 600 }}>Drug</th>
                  <th style={{ padding: '6px 10px', color: '#6b716c', fontWeight: 600 }}>Dose</th>
                  <th style={{ padding: '6px 10px', color: '#6b716c', fontWeight: 600 }}>Frequency</th>
                  <th style={{ padding: '6px 10px', color: '#6b716c', fontWeight: 600 }}>Indication</th>
                </tr>
              </thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e4dfd3', background: i % 2 === 0 ? '#faf8f4' : 'white' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{m.drugName}</td>
                    <td style={{ padding: '8px 10px' }}>{m.dose}</td>
                    <td style={{ padding: '8px 10px' }}>{m.frequency}</td>
                    <td style={{ padding: '8px 10px', color: '#6b716c' }}>{m.indication}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>

      {interactions.length > 0 && (
        <section className="dc-card">
          <h3>Flagged interactions</h3>
          <p className="subtle" style={{ fontSize: 12, marginTop: 4, marginBottom: 12 }}>Automatically detected during regimen extraction</p>
          <ul className="simple-list">
            {interactions.map((ix, i) => (
              <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #e4dfd3' }}>
                <span style={{ fontWeight: 600 }}>{ix.drugs.join(' + ')}</span>
                <span style={{ marginLeft: 8, fontSize: 12, textTransform: 'uppercase', color: ix.severity === 'major' ? '#b2492b' : '#c8843a' }}>{ix.severity}</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#444' }}>{ix.note}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
