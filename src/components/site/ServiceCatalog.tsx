import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { brl } from "@/lib/format";
import { groupByCategory, servicesQuery } from "@/lib/queries";
import type { Service } from "@/lib/pricing";

function PriceTag({ s }: { s: Service }) {
  return (
    <span className="whitespace-nowrap text-right">
      {s.price_type === "from" && <span className="mr-1 text-xs uppercase tracking-wider text-muted-foreground">a partir de</span>}
      <span className="font-display text-xl font-semibold text-primary">{brl(s.price_cents)}</span>
      {s.price_type === "fixed" && !s.requires_length && <span className="ml-1 text-xs text-muted-foreground">(fixo)</span>}
    </span>
  );
}

function LengthRows({ s }: { s: Service }) {
  const rows = [
    ["Curto", s.price_short_cents],
    ["Médio", s.price_medium_cents],
    ["Longo", s.price_long_cents],
  ] as const;
  return (
    <ul className="divide-y divide-border/70">
      {rows.map(([l, v]) => (
        <li key={l} className="flex items-baseline justify-between gap-4 py-3">
          <span className="text-sm font-medium uppercase tracking-wide">{l}</span>
          <span className="font-display text-xl font-semibold text-primary">{brl(v ?? 0)}</span>
        </li>
      ))}
      <li className="flex items-baseline justify-between gap-4 py-3">
        <span className="text-sm font-medium uppercase tracking-wide">Extra longo / volumoso</span>
        <span className="text-right text-sm text-muted-foreground">
          + <span className="font-display text-xl font-semibold text-primary">{brl(s.extra_long_addon_cents ?? 0)}</span>
          <span className="block text-xs">sobre o preço do comprimento</span>
        </span>
      </li>
    </ul>
  );
}

export function ServiceCatalog() {
  const { data, isLoading, error, refetch } = useQuery(servicesQuery());
  if (isLoading)
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p>Não foi possível carregar os serviços.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    );
  if (!data?.length) return <p className="text-center text-muted-foreground">Nenhum serviço disponível no momento.</p>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groupByCategory(data).map(([cat, list]) => (
        <section key={cat} className={`rounded-2xl border border-border/70 bg-card p-6 shadow-soft sm:p-8 ${cat === "CABELO" ? "md:row-span-2" : ""}`}>
          <h3 className="font-display text-2xl font-semibold tracking-wide">{cat}</h3>
          <div className="mt-1 h-px w-12 bg-gold" />
          <div className="mt-4">
            {list.map((s) =>
              s.requires_length ? (
                <div key={s.id}>
                  {list.length > 1 && <p className="mt-2 font-medium">{s.name}</p>}
                  <LengthRows s={s} />
                </div>
              ) : (
                <div key={s.id} className="flex items-baseline justify-between gap-4 border-b border-border/70 py-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-wide">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                  <PriceTag s={s} />
                </div>
              ),
            )}
          </div>
        </section>
      ))}
      <div className="flex flex-col items-start justify-center gap-4 rounded-2xl bg-accent p-8">
        <p className="font-display text-2xl">Pronta para cuidar dos seus fios?</p>
        <p className="text-sm text-muted-foreground">Valores “a partir de” podem variar após avaliação do cabelo no salão.</p>
        <Button asChild size="lg"><Link to="/agendar">Agendar horário</Link></Button>
      </div>
    </div>
  );
}