export function AlertDetailPage() {
  return (
    <section className="dc-card">
      <h2>Alert detail · day 4 red flag</h2>
      <p>
        Pattern consistent with early CHF decompensation. Automatic actions triggered: SMS to caregiver, pre-visit summary drafted, and same-day cardiology slot offered.
      </p>
      <ul className="simple-list">
        <li>Transcript: "I weighed 187 and breathing is a little tight walking to the kitchen."</li>
        <li>Rule hit: weight gain {'>'}2 lb in 24h + new symptom.</li>
        <li>Status: escalation active.</li>
      </ul>
    </section>
  );
}
