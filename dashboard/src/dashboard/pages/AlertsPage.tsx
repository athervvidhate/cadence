import { Link } from 'react-router-dom';
import { useDashboardData } from '../DashboardDataContext';
import { formatDateTime } from '../formatters';

export function AlertsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <section className="dc-card">
      <h2>Alert history</h2>
      {isLoading && <p>Loading alerts...</p>}
      {error && <p>Could not load alerts: {error.message}</p>}
      <ul className="simple-list">
        {data?.alertHistory.map((alert) => (
          <li key={alert._id}>
            <Link to={`/patients/${data.patient._id}/alerts/${alert._id}`}>
              {formatDateTime(alert.createdAt)} · {alert.level}: {alert.summary}
            </Link>
          </li>
        ))}
        {data && data.alertHistory.length === 0 && <li>No alerts recorded for this patient.</li>}
      </ul>
    </section>
  );
}
