import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/SiteChrome";
import { BookingForm, type BookingResult } from "@/components/site/BookingForm";
import { confirmationWhatsAppLink } from "@/lib/whatsapp-confirmation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bookedByLabel } from "@/lib/booked-by";
import { brl, formatPhone, spShortDate, spTime, STATUS_LABEL } from "@/lib/format";

const AUTHORIZED_STAFF = ["Camila", "Elaine", "Iramar"];

type Status = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de agendamentos | D’ELAS — Studio de Beleza" },
      { name: "description", content: "Agenda da equipe do D’ELAS Studio de Beleza." },
      { property: "og:title", content: "Painel — D’ELAS" },
      { property: "og:description", content: "Agenda da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Painel,
});

function Painel() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<BookingResult | null>(null);
  const waLink = created ? confirmationWhatsAppLink({ name: created.client_name, phone: created.phone, services: created.service_names, startsAt: created.starts_at }) : null;

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("display_name,email").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id).maybeSingle(),
      ]);
      return { name: p?.display_name || p?.email || u.user.email, role: r?.role ?? null };
    },
  });
  const { data: appts = [], isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").order("starts_at", { ascending: true }).gte("starts_at", new Date(Date.now() - 7 * 864e5).toISOString());
      if (error) throw error;
      return data;
    },
  });

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-center text-xs font-medium tracking-wide text-primary">
        AMBIENTE DE TESTE · D’ELAS STUDIO DE BELEZA
      </div>
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{me?.name}</span>
            <span className="hidden text-xs text-muted-foreground md:inline">Equipe: {AUTHORIZED_STAFF.join(" · ")}</span>
            <Button size="sm" variant="outline" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}>Sair</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {me && !me.role && <p className="mb-4 rounded-md border border-border p-3 text-sm">Sua conta ainda não tem acesso de equipe.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-primary">Agenda interna</p>
            <h1 className="text-3xl">Agendamentos</h1>
          </div>
          <Button onClick={() => setOpen(true)}>Novo agendamento</Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Cada marcação identifica automaticamente quem da equipe realizou o agendamento.</p>
        <div className="mt-6 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && appts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>}
          {appts.map((a) => {
            const services = (a.services as { name: string }[]) ?? [];
            return (
              <article key={a.id} className="rounded-lg border border-border bg-card p-4" data-testid="appointment">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{spShortDate(a.starts_at)} · {spTime(a.starts_at)}–{spTime(a.ends_at)} · {a.client_name}</p>
                    <p className="text-sm text-muted-foreground">{formatPhone(a.client_phone)} · {services.map((s) => s.name).join(", ")} · {a.has_from_price ? "a partir de " : ""}{brl(a.estimated_total_cents)}</p>
                    <p className="mt-1 text-sm"><span className="text-muted-foreground">Agendado por:</span> <strong>{bookedByLabel(a)}</strong></p>
                    {a.notes && <p className="text-sm text-muted-foreground">Obs.: {a.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary">{a.code} · {STATUS_LABEL[a.status]}</Badge>
                    <div className="flex flex-wrap gap-1">
                      {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "confirmed")}>Confirmar</Button>}
                      {(a.status === "pending" || a.status === "confirmed") && <>
                        <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "completed")}>Concluir</Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "cancelled")}>Cancelar</Button>
                      </>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreated(null); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Novo agendamento</DialogTitle></DialogHeader>
          {created ? (
            <div className="space-y-4">
              <p className="text-sm">Agendamento <strong className="text-foreground">{created.code}</strong> criado para <strong className="text-foreground">{created.client_name}</strong> · {spShortDate(created.starts_at)} às {spTime(created.starts_at)}.</p>
              <p className="text-sm text-muted-foreground">Agendado por: <strong className="text-foreground">{me?.name}</strong></p>
              {waLink ? (
                <Button asChild>
                  <a href={waLink} target="_blank" rel="noopener noreferrer">Enviar confirmação pelo WhatsApp</a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">É necessário cadastrar um número de WhatsApp válido (DDD + número, ex.: (11) 98765-4321) para enviar a confirmação.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setCreated(null)}>Novo agendamento</Button>
                <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setCreated(null); }}>Fechar</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Agendado por: <strong className="text-foreground">{me?.name}</strong> (preenchido automaticamente)</p>
              <BookingForm onDone={(r) => { toast.success(`Agendamento ${r.code} criado`); setCreated(r); qc.invalidateQueries({ queryKey: ["appointments"] }); }} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
