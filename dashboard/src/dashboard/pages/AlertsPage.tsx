import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../DashboardDataContext';
import { formatDateTime } from '../formatters';
import type { DashboardAlert } from '../types';

const FILTERS = ['All', 'Open', 'Red', 'Yellow', 'Resolved'] as const;

function matchesFilter(alert: DashboardAlert, filter: string): boolean {
  if (filter === 'All') return true;
  if (filter === 'Open') return !alert.resolvedAt;
  if (filter === 'Resolved') return Boolean(alert.resolvedAt);
  return alert.level === filter.toLowerCase();
}

export function AlertsPage() {
  const { data, error, isLoading } = useDashboardData();
  const [activeFilter, setActiveFilter] = useState<string>('Open');
  const alerts = data?.alertHistory.filter((alert) => matchesFilter(alert, activeFilter)) ?? [];
  const openCount = data?.alertHistory.filter((alert) => !alert.resolvedAt).length ?? 0;
  const resolvedCount = data?.alertHistory.filter((alert) => alert.resolvedAt).length ?? 0;

  return (
    <>
      <header className="top-row">
        <div className="breadcrumbs">PATIENTS / {data?.patient.patientName.toUpperCase() ?? 'LOADING'} / ALERTS</div>
        <button className="dc-btn dc-btn-ghost" style={{ fontSize: 13 }}>Notification settings</button>
      </header>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="dc-h-eyebrow" style={{ marginBottom: 8 }}>
            {openCount} open · {resolvedCount} resolved
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, lineHeight: 1.05, margin: 0, letterSpacing: '-0.01em' }}>
            Alert history
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 600, lineHeight: 1.5 }}>
            Sorted newest first from patient check-ins and escalation rules.
          </p>
        </div>
        <div className="row gap-1" style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 999, padding: 4, flexShrink: 0 }}>
          {FILTERS.map((filter) => (
            <button key={filter} onClick={() => setActiveFilter(filter)} style={{
              padding: '6px 12px', borderRadius: 999, fontSize: 12.5, border: 'none', cursor: 'pointer',
              background: activeFilter === filter ? 'var(--ink)' : 'transparent',
              color: activeFilter === filter ? 'var(--bg)' : 'var(--ink-2)',
            }}>{filter}</button>
          ))}
        </div>
      </div>

      {isLoading && <section className="dc-card">Loading alerts...</section>}
      {error && <section className="dc-card">Could not load alerts: {error.message}</section>}

      <div className="col gap-2">
        {alerts.map((alert) => (
          <div key={alert._id} className="dc-card" style={{ padding: 16, borderLeft: `3px solid var(--${alert.level === 'red' || alert.level === 'urgent' ? 'danger' : alert.level === 'yellow' ? 'warn' : 'accent'})` }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <div className="col flex-1" style={{ gap: 4 }}>
                <div className="row gap-2" style={{ alignItems: 'center' }}>
                  <span className={`dc-pill ${alert.level === 'urgent' ? 'red' : alert.level}`}>
                    <div className="dot" />
                    {alert.level}
                  </span>
                  {alert.resolvedAt && <span className="dc-tag">resolved</span>}
                  <span className="text-mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                    {formatDateTime(alert.createdAt)}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 500 }}>{alert.summary}</h3>
                {(alert.actionsTaken ?? []).length > 0 && (
                  <div className="row gap-2" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                    {alert.actionsTaken?.map((action, index) => (
                      <span key={`${action.type}-${index}`} className="dc-tag">
                        {action.type ?? 'action'} · {action.status ?? 'pending'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link to={`/patients/${data?.patient._id}/alerts/${alert._id}`} className="dc-btn dc-btn-primary" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                Open
              </Link>
            </div>
          </div>
        ))}
        {data && alerts.length === 0 && <section className="dc-card">No alerts match this filter.</section>}
      </div>
    </>
  );
}
