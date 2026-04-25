type PageScaffoldProps = {
  title: string;
  body: string;
};

export function PageScaffold({ title, body }: PageScaffoldProps) {
  return (
    <section className="dc-card">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}
