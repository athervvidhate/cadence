import { useDashboardData } from '../DashboardDataContext';
import { formatDate } from '../formatters';

export function AppointmentsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <section className="dc-card">
      <h2>Upcoming appointments</h2>
      {isLoading && <p>Loading appointments...</p>}
      {error && <p>Could not load appointments: {error.message}</p>}
      <ul className="simple-list">
        {data?.upcomingAppointments.map((appointment, index) => (
          <li key={`${appointment.date ?? 'appointment'}-${index}`}>
            {appointment.date ? `${formatDate(appointment.date)} · ` : ''}
            {appointment.title ?? appointment.type ?? 'Appointment'}
          </li>
        ))}
        {data && data.upcomingAppointments.length === 0 && <li>No upcoming appointments recorded.</li>}
      </ul>
    </section>
  );
}
