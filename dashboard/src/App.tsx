import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { PATIENT_ID } from './dashboard/constants';
import { DashboardLayout } from './dashboard/components/DashboardLayout';
import { OverviewPage } from './dashboard/pages/OverviewPage';
import { TrendsPage } from './dashboard/pages/TrendsPage';
import { MedicationsPage } from './dashboard/pages/MedicationsPage';
import { AlertsPage } from './dashboard/pages/AlertsPage';
import { AlertDetailPage } from './dashboard/pages/AlertDetailPage';
import { AppointmentsPage } from './dashboard/pages/AppointmentsPage';
import { DocumentsPage } from './dashboard/pages/DocumentsPage';
import { TimeWarpPage } from './dashboard/pages/TimeWarpPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/patients/${PATIENT_ID}/overview/red`} replace />} />
      <Route path="/patients/:id/overview/:status" element={<DashboardLayout page="overview"><OverviewPage /></DashboardLayout>} />
      <Route path="/patients/:id/trends" element={<DashboardLayout page="trends"><TrendsPage /></DashboardLayout>} />
      <Route path="/patients/:id/medications" element={<DashboardLayout page="medications"><MedicationsPage /></DashboardLayout>} />
      <Route path="/patients/:id/alerts" element={<DashboardLayout page="alerts"><AlertsPage /></DashboardLayout>} />
      <Route path="/patients/:id/alerts/:alertId" element={<DashboardLayout page="alerts"><AlertDetailPage /></DashboardLayout>} />
      <Route path="/patients/:id/appointments" element={<DashboardLayout page="appointments"><AppointmentsPage /></DashboardLayout>} />
      <Route path="/patients/:id/documents" element={<DashboardLayout page="documents"><DocumentsPage /></DashboardLayout>} />
      <Route path="/patients/:id/time-warp" element={<DashboardLayout page="overview"><TimeWarpPage /></DashboardLayout>} />
    </Routes>
  );
}

export default App;
