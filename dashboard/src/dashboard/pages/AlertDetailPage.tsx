import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PATIENT_ID } from '../constants';
import type { AlertRecord } from '../useDashboard';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const LEVEL_LABEL: Record<string, string> = { yellow: 'Watch', red: 'Action needed', urgent: 'Urgent' };

export function AlertDetailPage() {
  const { id = PATIENT_ID, alertId } = useParams();
  const [alert, setAlert] = useState<AlertRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alertId) return;
    fetch(`${API_BASE}/api/patients/${id}/alerts/${alertId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setAlert)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, alertId]);

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error) return <p style={{ padding: 24, color: 'red' }}>Error: {error}</p>;
  if (!alert) return <p style={{ padding: 24 }}>Alert not found.</p>;

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">
          <Link to={`/patients/${id}/alerts`} style={{ color: '#6b716c', textDecoration: 'none' }}>ALERTS</Link>
          {' / DETAIL'}
        </div>
      </header>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className={`dc-pill ${alert.level}`}>{LEVEL_LABEL[alert.level] ?? alert.level}</span>
          <span className="subtle">{new Date(alert.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
          {alert.resolvedAt && <span style={{ color: '#2d6a4f', fontSize: 13 }}>· Resolved {new Date(alert.resolvedAt).toLocaleDateString()}</span>}
        </div>
        <p style={{ fontSize: 16, lineHeight: 1.6 }}>{alert.summary}</p>
      </section>

      <section className="dc-card" style={{ marginBottom: 20 }}>
        <h3>Actions taken</h3>
        {(!alert.actionsTaken || alert.actionsTaken.length === 0)
          ? <p className="subtle">No actions recorded.</p>
          : (
            <ul className="simple-list" style={{ marginTop: 8 }}>
              {alert.actionsTaken.map((a, i) => (
                <li key={i} style={{ padding: '8px 0', display: 'flex', gap: 12, borderBottom: '1px solid #e4dfd3' }}>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 12, color: '#6b716c', width: 60 }}>{a.type}</span>
                  <span>→ {a.to}{a.specialty ? ` (${a.specialty})` : ''}</span>
                  <span className="subtle" style={{ marginLeft: 'auto' }}>{a.status}</span>
                </li>
              ))}
            </ul>
          )}
      </section>

      {alert.resolution && (
        <section className="dc-card">
          <h3>Resolution</h3>
          <p style={{ marginTop: 8 }}>{alert.resolution.replace(/_/g, ' ')}</p>
        </section>
      )}
    </>
  );
}
