import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/SiteChrome";
import { ServiceCatalog } from "@/components/site/ServiceCatalog";
import hero from "@/assets/hero-salon.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "D’ELAS — Studio de Beleza | Agendamento de cabelo online" },
      { name: "description", content: "Cortes, escovas, coloração, progressiva, mechas, morena iluminada e tratamentos. Veja preços e agende seu horário no D’ELAS Studio de Beleza." },
      { property: "og:title", content: "D’ELAS — Studio de Beleza" },
      { property: "og:description", content: "Serviços de cabelo com hora marcada. Veja o catálogo e agende online." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Interior do D’ELAS Studio de Beleza" width={1600} height={1104} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0 -z-10" />
        <div className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-32 text-ink-foreground">
          <p className="eyebrow text-gold">Studio de Beleza · Cabelo</p>
          <h1 className="mt-4 max-w-2xl text-5xl font-medium leading-[1.05] sm:text-7xl">D’ELAS</h1>
          <p className="mt-5 max-w-lg text-lg font-light text-ink-foreground/90">
            Cuidado, técnica e um olhar atento para cada fio. Um espaço feito para você se sentir em casa — e sair renovada.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/agendar">Agendar horário</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-ink-foreground/40 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
              <a href="#servicos">Ver serviços e preços</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-ink-foreground/70">Terça a sábado · 09:00 às 18:00</p>
        </div>
      </section>

      <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-20">
        <div className="mb-10 text-center">
          <p className="eyebrow text-primary">Catálogo</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">Serviços de cabelo</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Preços marcados como “a partir de” podem variar conforme avaliação. Progressiva e mechas variam pelo comprimento.
          </p>
        </div>
        <ServiceCatalog />
      </section>
    </PublicLayout>
  );
}