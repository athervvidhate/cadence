import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { PATIENT_ID } from '../constants';
import type { NavPage } from '../types';

type DashboardLayoutProps = {
  children: ReactNode;
  page: NavPage;
};

export function DashboardLayout({ children, page }: DashboardLayoutProps) {
  const { id = PATIENT_ID } = useParams();
  const location = useLocation();
  const nav: Array<[string, string, NavPage]> = [
    ['Overview', `/patients/${id}/overview/red`, 'overview'],
    ['Trends', `/patients/${id}/trends`, 'trends'],
    ['Medications', `/patients/${id}/medications`, 'medications'],
    ['Alerts', `/patients/${id}/alerts`, 'alerts'],
    ['Appointments', `/patients/${id}/appointments`, 'appointments'],
    ['Documents', `/patients/${id}/documents`, 'documents'],
  ];

  return (
    <div className="dc-dash">
      <aside className="dc-dash-side">
        <div className="brand">
          <div className="brand-mark">D</div>
          <span className="logo">DischargeCoach</span>
        </div>
        <div className="eyebrow">Patient</div>
        <div className="patient-card">
          <div>
            <div className="patient-name">Robert Chen</div>
            <div className="subtle">Caregiver view</div>
          </div>
          <span className="dc-pill yellow">Day 4</span>
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
  );
}
