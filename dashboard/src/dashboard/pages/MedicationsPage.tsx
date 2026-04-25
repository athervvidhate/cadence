import { useDashboardData } from '../DashboardDataContext';

export function MedicationsPage() {
  const { data, error, isLoading } = useDashboardData();

  return (
    <section className="dc-card">
      <h2>Active regimen</h2>
      {isLoading && <p>Loading medications...</p>}
      {error && <p>Could not load medications: {error.message}</p>}
      <ul className="simple-list">
        {data?.regimen.medications.map((medication) => (
          <li key={`${medication.drugName}-${medication.dose}`}>
            <strong>{medication.drugName}</strong> · {medication.dose} · {medication.frequency}
            {medication.instructions ? ` · ${medication.instructions}` : ''}
          </li>
        ))}
        {data && data.regimen.medications.length === 0 && <li>No medications extracted yet.</li>}
      </ul>
      {data && data.regimen.interactions.length > 0 && (
        <>
          <h3>Interactions</h3>
          <ul className="simple-list">
            {data.regimen.interactions.map((interaction) => (
              <li key={`${interaction.severity}-${interaction.drugs.join('-')}`}>
                {interaction.severity}: {interaction.drugs.join(' + ')} · {interaction.note}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
