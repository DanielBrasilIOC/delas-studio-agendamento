export const TZ = "America/Sao_Paulo";
// Brazil has no DST since 2019; São Paulo is a fixed UTC-03:00 offset.
export const SP_OFFSET = "-03:00";

export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: cents % 100 ? 2 : 0 });
}

export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d;
}
export function isValidPhone(raw: string): boolean {
  const d = normalizePhone(raw);
  return d.length === 10 || d.length === 11;
}
export function formatPhone(d: string): string {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/** yyyy-mm-dd of the given instant in São Paulo */
export function spDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function spTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
export function spLongDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso));
}
export function spShortDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(iso));
}
export function spDateTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
export function toIso(date: string, time: string): string {
  return `${date}T${time.slice(0, 5)}:00${SP_OFFSET}`;
}
/** 0 = domingo ... 6 = sábado */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00${SP_OFFSET}`).getUTCDay();
}
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00${SP_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + n);
  return spDate(d);
}
/** Date object (local midnight) for a yyyy-mm-dd string, for calendar widgets */
export function dateToLocal(date: string): Date {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function localToDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function rpcErrorMessage(err: { message?: string } | null | undefined): string {
  const m = err?.message ?? "Erro inesperado. Tente novamente.";
  return m.replace(/^[A-Z_]+:\s*/, "");
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente de confirmação",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Ausência",
};
export const LENGTH_LABEL: Record<string, string> = { curto: "Curto", medio: "Médio", longo: "Longo" };