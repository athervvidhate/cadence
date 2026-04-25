import { Link } from 'react-router-dom';
import { PATIENT_ID } from '../constants';

export function AlertsPage() {
  return (
    <section className="dc-card">
      <h2>Alert history</h2>
      <ul className="simple-list">
        <li>
          <Link to={`/patients/${PATIENT_ID}/alerts/day4`}>Day 4 · red flag: +3 lb and new shortness of breath</Link>
        </li>
        <li>Day 4 · yellow: {'>'}2 lb in 24h</li>
        <li>Day 2 · resolved missed evening dose</li>
      </ul>
    </section>
  );
}
