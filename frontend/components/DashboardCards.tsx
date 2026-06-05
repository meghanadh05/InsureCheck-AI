type Card = { label: string; value: string; hint: string };

export function DashboardCards({ cards }: { cards: Card[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="panel p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/55">{card.label}</p>
          <p className="mt-3 font-display text-3xl">{card.value}</p>
          <p className="mt-2 text-sm text-ink/70">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
