import { useDashboardData } from '../DashboardDataContext';

export function DocumentsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <section className="dc-card">
      <h2>Documents</h2>
      {isLoading && <p>Loading document context...</p>}
      {error && <p>Could not load patient context: {error.message}</p>}
      {data && (
        <ul className="simple-list">
          <li>Patient: {data.patient.patientName}</li>
          <li>Diagnosis: {data.patient.diagnosis}</li>
          <li>Regimen extraction: {data.regimen.medications.length > 0 ? 'available' : 'not uploaded yet'}</li>
        </ul>
      )}
    </section>
  );
}
