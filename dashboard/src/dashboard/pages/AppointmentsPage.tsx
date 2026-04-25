import { useDashboardData } from '../DashboardDataContext';
import { formatDate } from '../formatters';

export function AppointmentsPage() {
  const { data, error, isLoading } = useDashboardData();
  const appointments = data?.upcomingAppointments ?? [];

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {data?.patient.patientName.toUpperCase() ?? 'LOADING'} / APPOINTMENTS</div>
        <div className="row gap-2">
          <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Sync calendar</button>
          <button className="dc-btn dc-btn-primary" style={{ fontSize: 13 }}>Add appointment</button>
        </div>
      </header>

      <div>
        <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>
          {appointments.length} upcoming
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
          Recovery calendar
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
          Follow-ups and clinic visits from the patient care plan.
        </p>
      </div>

      {isLoading && <section className="dc-card">Loading appointments...</section>}
      {error && <section className="dc-card">Could not load appointments: {error.message}</section>}

      <div className="col gap-3">
        {appointments.map((appointment, index) => (
          <div key={`${appointment.date ?? 'appointment'}-${index}`} className="dc-card" style={{ padding: 14 }}>
            <div className="row gap-3">
              <div style={{ width: 72, textAlign: 'center', padding: '8px 0', background: 'var(--bg-elev)', borderRadius: 8, border: '1px solid var(--hairline)', flexShrink: 0 }}>
                <div className="text-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  {appointment.date ? formatDate(appointment.date) : 'TBD'}
                </div>
              </div>
              <div className="col flex-1" style={{ gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{appointment.title ?? appointment.type ?? 'Appointment'}</span>
                {appointment.type && <span className="dc-tag">{appointment.type}</span>}
              </div>
            </div>
          </div>
        ))}
        {data && appointments.length === 0 && <section className="dc-card">No upcoming appointments recorded.</section>}
      </div>
    </>
  );
}
