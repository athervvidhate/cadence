import { useDashboard } from '../useDashboard';

const TYPE_LABEL: Record<string, string> = {
  cardiology: 'Cardiology follow-up',
  primary_care: 'Primary care visit',
  labs_BMP: 'Lab work — Basic Metabolic Panel',
  labs: 'Lab work',
  ed: 'Emergency Department',
};

const TYPE_ICON: Record<string, string> = {
  cardiology: '🫀',
  primary_care: '🩺',
  labs_BMP: '🧪',
  labs: '🧪',
};

export function AppointmentsPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;

  const appointments = data?.upcomingAppointments ?? [];
  const dischargeDate = data?.patient?.dischargeDate
    ? new Date(data.patient.dischargeDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {(data?.patient?.patientName ?? '—').toUpperCase()} / APPOINTMENTS</div>
      </header>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <p className="subtle" style={{ marginBottom: 16 }}>Discharge date: {dischargeDate}</p>
        {appointments.length === 0
          ? <p className="subtle">No follow-up appointments extracted from discharge papers.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {appointments
                .sort((a, b) => a.daysFromDischarge - b.daysFromDischarge)
                .map((appt, i) => {
                  const apptDate = new Date(appt.date);
                  const isPast = apptDate < new Date();
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', background: '#faf8f4', borderRadius: 8, border: '1px solid #e4dfd3', opacity: isPast ? 0.6 : 1 }}>
                      <span style={{ fontSize: 28 }}>{TYPE_ICON[appt.type] ?? '📅'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{TYPE_LABEL[appt.type] ?? appt.type.replace(/_/g, ' ')}</div>
                        <div className="subtle" style={{ fontSize: 13, marginTop: 3 }}>
                          Day {appt.daysFromDischarge} · {apptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: isPast ? '#e4dfd3' : '#d4edda', color: isPast ? '#6b716c' : '#2d6a4f', fontWeight: 600 }}>
                        {isPast ? 'Past' : 'Upcoming'}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
      </section>
    </>
  );
}
