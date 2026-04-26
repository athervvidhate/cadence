import { Link, useParams } from 'react-router-dom';
import { useDashboard } from '../useDashboard';
import { PATIENT_ID } from '../constants';

const LEVEL_LABEL: Record<string, string> = { yellow: 'Watch', red: 'Action needed', urgent: 'Urgent' };

export function AlertsPage() {
  const { id = PATIENT_ID } = useParams();
  const { data, loading, error } = useDashboard();

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;

  const alerts = data?.alertHistory ?? [];

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {(data?.patient?.patientName ?? '—').toUpperCase()} / ALERTS</div>
      </header>

      <section className="dc-card">
        <h3>Alert history · {alerts.length} total</h3>
        {alerts.length === 0 && <p className="subtle">No alerts recorded.</p>}
        <ul className="simple-list" style={{ marginTop: 12 }}>
          {alerts.map((a) => (
            <li key={a._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #e4dfd3' }}>
              <span className={`dc-pill ${a.level}`} style={{ flexShrink: 0, marginTop: 2 }}>{LEVEL_LABEL[a.level] ?? a.level}</span>
              <div style={{ flex: 1 }}>
                <Link to={`/patients/${id}/alerts/${a._id}`} style={{ fontWeight: 600, color: '#1a1a1a', textDecoration: 'none' }}>
                  {a.summary.length > 100 ? a.summary.slice(0, 100) + '…' : a.summary}
                </Link>
                <div className="subtle" style={{ marginTop: 4, fontSize: 12 }}>
                  {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {a.resolvedAt && <span style={{ marginLeft: 8, color: '#2d6a4f' }}>· Resolved</span>}
                  {a.actionsTaken?.length > 0 && <span style={{ marginLeft: 8 }}>· {a.actionsTaken.length} action{a.actionsTaken.length > 1 ? 's' : ''} taken</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
