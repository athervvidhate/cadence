import { useParams } from 'react-router-dom';
import { useDashboardData } from '../DashboardDataContext';
import { formatDateTime } from '../formatters';

export function AlertDetailPage() {
  const { alertId } = useParams();
  const { data, error, isLoading } = useDashboardData();
  const alert = data?.alertHistory.find((item) => item._id === alertId);

  if (isLoading) {
    return <section className="dc-card">Loading alert...</section>;
  }

  if (error) {
    return <section className="dc-card">Could not load alert: {error.message}</section>;
  }

  if (!alert) {
    return <section className="dc-card">Alert not found.</section>;
  }

  return (
    <section className="dc-card">
      <h2>Alert detail · {alert.level}</h2>
      <p>{alert.summary}</p>
      <ul className="simple-list">
        <li>Created: {formatDateTime(alert.createdAt)}</li>
        <li>Status: {alert.resolvedAt ? `resolved · ${alert.resolution ?? 'no resolution noted'}` : 'active'}</li>
        {(alert.actionsTaken ?? []).map((action, index) => (
          <li key={`${action.type}-${index}`}>
            Action: {action.type ?? 'unknown'} {action.to ? `to ${action.to}` : ''} · {action.status ?? 'pending'}
          </li>
        ))}
      </ul>
    </section>
  );
}
