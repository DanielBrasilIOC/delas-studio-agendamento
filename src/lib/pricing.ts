export type HairLength = "curto" | "medio" | "longo";

export interface Service {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price_cents: number;
  price_type: "from" | "fixed";
  requires_length: boolean;
  price_short_cents: number | null;
  price_medium_cents: number | null;
  price_long_cents: number | null;
  extra_long_addon_cents: number | null;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  updated_at?: string;
  updated_by?: string | null;
}

export function lengthPrice(s: Service, length: HairLength): number {
  const v = length === "curto" ? s.price_short_cents : length === "medio" ? s.price_medium_cents : s.price_long_cents;
  return v ?? 0;
}

/** Mirrors server-side pricing in create_booking (the server is authoritative). */
export function servicePrice(s: Service, length: HairLength | null, extraLong: boolean): number | null {
  if (!s.requires_length) return s.price_cents;
  if (!length) return null;
  return lengthPrice(s, length) + (extraLong ? s.extra_long_addon_cents ?? 0 : 0);
}

export function estimate(services: Service[], length: HairLength | null, extraLong: boolean) {
  const needsLength = services.some((s) => s.requires_length);
  let total = 0;
  let complete = true;
  const items = services.map((s) => {
    const price = servicePrice(s, length, extraLong && needsLength);
    if (price === null) complete = false;
    total += price ?? 0;
    return { service: s, price };
  });
  const duration = Math.max(15, services.reduce((a, s) => a + s.duration_minutes, 0));
  return { items, total, complete, needsLength, hasFrom: services.some((s) => s.price_type === "from"), duration };
}