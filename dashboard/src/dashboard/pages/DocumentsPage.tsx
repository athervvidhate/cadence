import { useDashboardData } from '../DashboardDataContext';

export function DocumentsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {data?.patient.patientName.toUpperCase() ?? 'LOADING'} / DOCUMENTS</div>
        <div className="row gap-2">
          <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Download all</button>
          <button className="dc-btn dc-btn-primary" style={{ fontSize: 13 }}>Upload</button>
        </div>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>Patient document context</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Documents
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Uploaded discharge material and extracted medication context for this patient.
        </p>
      </div>

      {isLoading && <section className="dc-card">Loading document context...</section>}
      {error && <section className="dc-card">Could not load patient context: {error.message}</section>}

      {data && (
        <section className="dc-card">
          <ul className="simple-list">
            <li>Patient: {data.patient.patientName}</li>
            <li>Diagnosis: {data.patient.diagnosis}</li>
            <li>Regimen extraction: {data.regimen.medications.length > 0 ? 'available' : 'not uploaded yet'}</li>
            <li>Medication records: {data.regimen.medications.length}</li>
            <li>Interaction records: {data.regimen.interactions.length}</li>
          </ul>
        </section>
      )}
    </>
  );
}
