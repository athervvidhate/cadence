import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PATIENT_ID } from '../constants';
import { getPatientDashboard } from '../api';
import { DashboardDataContext } from '../DashboardDataContext';
import { displayPatientName } from '../formatters';
import type { DashboardResponse, NavPage } from '../types';

type DashboardLayoutProps = {
  children: ReactNode;
  page: NavPage;
};

export function DashboardLayout({ children, page }: DashboardLayoutProps) {
  const { id = PATIENT_ID } = useParams();
  const location = useLocation();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const nav: Array<[string, string, NavPage]> = [
    ['Overview', `/patients/${id}/overview/red`, 'overview'],
    ['Trends', `/patients/${id}/trends`, 'trends'],
    ['Medications', `/patients/${id}/medications`, 'medications'],
    ['Alerts', `/patients/${id}/alerts`, 'alerts'],
    ['Appointments', `/patients/${id}/appointments`, 'appointments'],
    ['Documents', `/patients/${id}/documents`, 'documents'],
  ];

  useEffect(() => {
    let cancelled = false;

    getPatientDashboard(id)
      .then((dashboardData) => {
        if (!cancelled) {
          setData(dashboardData);
          setError(null);
        }
      })
      .catch((caughtError: Error) => {
        if (!cancelled) {
          setError(caughtError);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <DashboardDataContext.Provider value={{ data, error, isLoading }}>
      <div className="dc-dash">
        <aside className="dc-dash-side">
          <div className="brand">
            <div className="brand-mark">D</div>
            <span className="logo">DischargeCoach</span>
          </div>
          <div className="eyebrow">Patient</div>
          <div className="patient-card">
            <div>
              <div className="patient-name">{displayPatientName(data)}</div>
              <div className="subtle">{data?.patient.caregiver.name ?? 'Caregiver'} view</div>
            </div>
            <span className="dc-pill yellow">Day {data?.currentDay ?? '...'}</span>
          </div>
          <nav className="side-nav">
            {nav.map(([label, href, key]) => (
              <Link key={label} to={href} className={`dc-nav-item ${page === key ? 'active' : ''}`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="grow" />
          <Link className={`dc-nav-item ${location.pathname.includes('/time-warp') ? 'active' : ''}`} to={`/patients/${id}/time-warp`}>
            Time-warp demo
          </Link>
        </aside>
        <main className="dc-dash-main">{children}</main>
      </div>
    </DashboardDataContext.Provider>
  );
}
