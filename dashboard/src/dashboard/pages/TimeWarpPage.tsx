import { useDashboardData } from '../DashboardDataContext';

export function TimeWarpPage() {
  const { data } = useDashboardData();
  const progress = Math.min(data?.currentDay ?? 0, 7);

  return (
    <section className="dc-card">
      <h2>Timeline control</h2>
      <p>Current patient timeline is on day {data?.currentDay ?? '...'} of 30.</p>
      <div className="warp-meter" aria-hidden>
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className={index < progress ? 'active' : ''} />
        ))}
      </div>
      <div className="row gap-2">
        <button className="dc-btn dc-btn-ghost" type="button">
          Review timeline
        </button>
        <button className="dc-btn dc-btn-primary" type="button">
          Refresh status
        </button>
      </div>
    </section>
  );
}
