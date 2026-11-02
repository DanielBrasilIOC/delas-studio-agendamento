import { describe, it, expect } from "vitest";
import { estimate, type Service } from "@/lib/pricing";
import { generateSlots } from "@/lib/slots";
import { normalizePhone, isValidPhone, weekdayOf } from "@/lib/format";

const base = { description: null, price_short_cents: null, price_medium_cents: null, price_long_cents: null, extra_long_addon_cents: null, active: true, sort_order: 0 };
const progressiva: Service = { ...base, id: "p", category: "PROGRESSIVA", name: "PROGRESSIVA", price_cents: 16000, price_type: "fixed", requires_length: true, price_short_cents: 16000, price_medium_cents: 19000, price_long_cents: 25000, extra_long_addon_cents: 3000, duration_minutes: 180 };
const mechas: Service = { ...progressiva, id: "m", name: "MECHAS", price_short_cents: 35000, price_medium_cents: 40000, price_long_cents: 55000, extra_long_addon_cents: 5000 };
const escova: Service = { ...base, id: "e", category: "CABELO", name: "ESCOVA", price_cents: 7000, price_type: "from", requires_length: false, duration_minutes: 60 };
const tubo: Service = { ...base, id: "t", category: "CABELO", name: "TUBO", price_cents: 4000, price_type: "fixed", requires_length: false, duration_minutes: 0 };

describe("preços", () => {
  it("progressiva longo = R$ 250", () => expect(estimate([progressiva], "longo", false).total).toBe(25000));
  it("progressiva médio extra longo soma R$ 30 ao preço do comprimento", () => expect(estimate([progressiva], "medio", true).total).toBe(22000));
  it("mechas curto extra longo soma R$ 50", () => expect(estimate([mechas], "curto", true).total).toBe(40000));
  it("mechas longo = R$ 550", () => expect(estimate([mechas], "longo", false).total).toBe(55000));
  it("comprimento é exigido para progressiva", () => expect(estimate([progressiva], null, false).complete).toBe(false));
  it("adicional extra longo não se aplica a serviços sem comprimento", () => expect(estimate([escova], null, true).total).toBe(7000));
  it("escova é 'a partir de', tubo é fixo", () => {
    expect(estimate([escova], null, false).hasFrom).toBe(true);
    expect(estimate([tubo], null, false).hasFrom).toBe(false);
  });
});

describe("horários", () => {
  const busy = [{ starts_at: "2030-01-08T10:00:00-03:00", ends_at: "2030-01-08T11:00:00-03:00" }];
  const slots = generateSlots({ date: "2030-01-08", open: "09:00", close: "18:00", duration: 60, busy, nowMs: 0 });
  it("não oferece horário sobreposto", () => {
    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("09:00");
    expect(slots).toContain("11:00");
  });
  it("serviço deve terminar até 18:00", () => {
    expect(slots).toContain("17:00");
    expect(slots).not.toContain("17:30");
  });
  it("não oferece horários passados", () => {
    const now = Date.parse("2030-01-08T15:10:00-03:00");
    const s = generateSlots({ date: "2030-01-08", open: "09:00", close: "18:00", duration: 30, busy: [], nowMs: now });
    expect(s[0]).toBe("15:30");
  });
  it("domingo=0 e segunda=1", () => {
    expect(weekdayOf("2030-01-06")).toBe(0);
    expect(weekdayOf("2030-01-07")).toBe(1);
  });
});

describe("telefone", () => {
  it("normaliza com +55", () => expect(normalizePhone("+55 (11) 98765-4321")).toBe("11987654321"));
  it("rejeita sem DDD", () => expect(isValidPhone("98765-4321")).toBe(false));
});