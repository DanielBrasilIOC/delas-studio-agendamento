import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { groupByCategory, hoursQuery, servicesQuery } from "@/lib/queries";
import { estimate, type HairLength } from "@/lib/pricing";
import { generateSlots } from "@/lib/slots";
import { addDays, brl, isValidPhone, rpcErrorMessage, spDate, spLongDate, spTime, toIso, weekdayOf, LENGTH_LABEL } from "@/lib/format";

export interface BookingResult {
  code: string;
  starts_at: string;
  ends_at: string;
  estimated_total_cents: number;
  has_from_price: boolean;
  client_name: string;
  phone: string;
  service_names: string[];
}

export function BookingForm({ onDone }: { onDone: (r: BookingResult) => void }) {
  const { data: services = [] } = useQuery(servicesQuery());
  const { data: hours = [] } = useQuery(hoursQuery());
  const [selected, setSelected] = useState<string[]>([]);
  const [length, setLength] = useState<HairLength | null>(null);
  const [extraLong, setExtraLong] = useState(false);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busySubmit, setBusySubmit] = useState(false);

  const chosen = services.filter((s) => selected.includes(s.id));
  const est = estimate(chosen, length, extraLong);

  const days = useMemo(() => {
    const today = spDate();
    const out: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, i);
      if (hours.find((h) => h.weekday === weekdayOf(d))?.is_open) out.push(d);
    }
    return out;
  }, [hours]);

  const { data: busy = [] } = useQuery({
    queryKey: ["busy", date],
    enabled: !!date,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_busy_intervals", { p_date: date });
      if (error) throw error;
      return data ?? [];
    },
  });
  const bh = date ? hours.find((h) => h.weekday === weekdayOf(date)) : undefined;
  const slots = bh && chosen.length
    ? generateSlots({ date, open: bh.open_time.slice(0, 5), close: bh.close_time.slice(0, 5), duration: est.duration, busy, nowMs: Date.now() })
    : [];

  const toggle = (id: string) => { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); setTime(""); };

  async function submit() {
    if (!chosen.length) { toast.error("Escolha ao menos um serviço"); return; }
    if (est.needsLength && !length) { toast.error("Informe o comprimento do cabelo"); return; }
    if (!date || !time) { toast.error("Escolha data e horário"); return; }
    if (name.trim().length < 2) { toast.error("Informe o nome"); return; }
    if (!isValidPhone(phone)) { toast.error("Telefone inválido (DDD + número)"); return; }
    setBusySubmit(true);
    const { data, error } = await supabase.rpc("create_booking", {
      p_name: name, p_phone: phone, p_service_ids: selected, p_hair_length: est.needsLength ? (length as string) : (null as unknown as string),
      p_extra_long: extraLong, p_starts_at: toIso(date, time), p_notes: notes,
    });
    setBusySubmit(false);
    if (error) { toast.error(rpcErrorMessage(error)); return; }
    onDone({ ...(data as unknown as Omit<BookingResult, "phone" | "service_names">), phone, service_names: chosen.map((s) => s.name) });
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xl">1. Serviços</h3>
        <div className="mt-3 space-y-4">
          {groupByCategory(services).map(([cat, list]) => (
            <div key={cat}>
              <p className="eyebrow text-primary">{cat}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {list.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50">
                    <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                    <span className="flex-1 text-sm">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.requires_length ? "por comprimento" : `${s.price_type === "from" ? "a partir de " : ""}${brl(s.price_cents)}`}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {est.needsLength && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm">Comprimento:</span>
            {(["curto", "medio", "longo"] as HairLength[]).map((l) => (
              <Button key={l} type="button" size="sm" variant={length === l ? "default" : "outline"} onClick={() => setLength(l)}>{LENGTH_LABEL[l]}</Button>
            ))}
            <label className="ml-2 flex items-center gap-2 text-sm"><Checkbox checked={extraLong} onCheckedChange={(v) => setExtraLong(!!v)} /> Extra longo / volumoso</label>
          </div>
        )}
        {chosen.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Estimativa: <strong className="text-foreground">{est.hasFrom ? "a partir de " : ""}{brl(est.total)}</strong> · duração aprox. {est.duration} min
          </p>
        )}
      </section>

      <section>
        <h3 className="text-xl">2. Data e horário</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {days.map((d) => (
            <Button key={d} type="button" size="sm" variant={date === d ? "default" : "outline"} onClick={() => { setDate(d); setTime(""); }}>
              {spLongDate(`${d}T12:00:00-03:00`).split(",").slice(0, 2).join(",")}
            </Button>
          ))}
        </div>
        {date && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!chosen.length ? <p className="text-sm text-muted-foreground">Escolha os serviços para ver os horários.</p>
              : slots.length === 0 ? <p className="text-sm text-muted-foreground">Sem horários livres nesta data.</p>
              : slots.map((t) => (
                <Button key={t} type="button" size="sm" variant={time === t ? "default" : "outline"} onClick={() => setTime(t)}>{t}</Button>
              ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h3 className="text-xl sm:col-span-2">3. Dados da cliente</h3>
        <div><Label htmlFor="bk-name">Nome</Label><Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
        <div><Label htmlFor="bk-phone">WhatsApp / telefone</Label><Input id="bk-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 98765-4321" inputMode="tel" /></div>
        <div className="sm:col-span-2"><Label htmlFor="bk-notes">Observações (opcional)</Label><Textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>
      </section>

      <Button size="lg" onClick={submit} disabled={busySubmit}>{busySubmit ? "Enviando…" : "Confirmar agendamento"}</Button>
    </div>
  );
}

export function BookingConfirmation({ r }: { r: BookingResult }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="eyebrow text-primary">Agendamento recebido</p>
      <h3 className="mt-2 text-2xl">Código {r.code}</h3>
      <p className="mt-2 text-sm">{r.client_name} · {spLongDate(r.starts_at)} às {spTime(r.starts_at)}</p>
      <p className="text-sm text-muted-foreground">Estimativa: {r.has_from_price ? "a partir de " : ""}{brl(r.estimated_total_cents)}</p>
      <p className="mt-4 text-sm text-muted-foreground">Sua solicitação foi enviada e está pendente de confirmação pela nossa equipe.</p>
    </div>
  );
}