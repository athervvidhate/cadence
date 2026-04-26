type InfoCardProps = {
  label: string;
  value: string;
  sub: string;
};

export function InfoCard({ label, value, sub }: InfoCardProps) {
  return (
    <article className="dc-card kpi-card">
      <div className="eyebrow">{label}</div>
      <div className="value">{value}</div>
      <div className="sub">{sub}</div>
    </article>
  );
}
