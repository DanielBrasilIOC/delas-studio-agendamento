import { describe, it, expect } from "vitest";
import { bookedByLabel } from "@/lib/booked-by";

describe("Agendado por", () => {
  it("mostra o nome da profissional logada que agendou pelo painel", () => {
    expect(bookedByLabel({ source: "painel", created_by: "u1", created_by_name: "Ana" })).toBe("Ana");
  });
  it("agendamento online do cliente não é atribuído a profissional", () => {
    expect(bookedByLabel({ source: "site", created_by: null, created_by_name: null })).toBe("Cliente (agendamento online)");
  });
});