export function TimeWarpPage() {
  return (
    <section className="dc-card">
      <h2>Time-warp demo control</h2>
      <p>Replay days 1-7 in 60 seconds with the scripted day-4 red flag sequence from the PRD.</p>
      <div className="warp-meter" aria-hidden>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="row gap-2">
        <button className="dc-btn dc-btn-ghost" type="button">
          Reset
        </button>
        <button className="dc-btn dc-btn-primary" type="button">
          Pause warp
        </button>
      </div>
    </section>
  );
}
