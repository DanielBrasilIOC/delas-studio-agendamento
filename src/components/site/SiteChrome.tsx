import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { settingsQuery, whatsappLink } from "@/lib/queries";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex flex-col leading-none" aria-label="D'ELAS — Studio de Beleza, início">
      <span className={`font-display text-2xl font-semibold tracking-wide ${light ? "text-ink-foreground" : "text-foreground"}`}>D’ELAS</span>
      <span className={`eyebrow mt-1 !text-[0.6rem] ${light ? "text-ink-foreground/80" : "text-muted-foreground"}`}>Studio de Beleza</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link to="/" hash="servicos" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">Serviços</Link>
          <Button asChild size="sm"><Link to="/agendar">Agendar horário</Link></Button>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { data: settings } = useQuery(settingsQuery());
  const wa = whatsappLink(settings?.whatsapp, "Olá! Gostaria de falar com o D'ELAS Studio de Beleza.");
  return (
    <footer className="mt-24 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 text-sm text-ink-foreground/70">Especialistas em cabelo. Atendimento com hora marcada.</p>
        </div>
        <div className="text-sm">
          <p className="eyebrow text-gold">Horário</p>
          <p className="mt-3 text-ink-foreground/80">Terça a sábado, 09:00 – 18:00</p>
          <p className="text-ink-foreground/60">Domingo e segunda: fechado</p>
          {settings?.address && <p className="mt-3 text-ink-foreground/80">{settings.address}</p>}
        </div>
        <div className="text-sm">
          <p className="eyebrow text-gold">Contato</p>
          <div className="mt-3 flex flex-col gap-2">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">WhatsApp</a>}
            {settings?.instagram && (
              <a href={`https://instagram.com/${settings.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">Instagram {settings.instagram}</a>
            )}
            <Link to="/privacidade" className="underline-offset-4 hover:underline">Política de privacidade</Link>
            <Link to="/auth" className="text-ink-foreground/50 underline-offset-4 hover:underline">Área da equipe</Link>
          </div>
        </div>
      </div>
      <p className="border-t border-ink-foreground/10 py-4 text-center text-xs text-ink-foreground/50">© {new Date().getFullYear()} D’ELAS — Studio de Beleza</p>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}