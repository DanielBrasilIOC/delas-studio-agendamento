import { describe, it, expect } from "vitest";
import { confirmationMessage, confirmationWhatsAppLink, HAIR_PROFESSIONAL } from "@/lib/whatsapp-confirmation";

const booking = {
  name: "Camila",
  phone: "(11) 98765-4321",
  services: ["CORTE COM ESCOVA", "ESCOVA"],
  startsAt: "2030-01-08T14:00:00-03:00",
};

describe("confirmação por WhatsApp", () => {
  it("gera a mensagem exatamente como pedida", () => {
    expect(confirmationMessage(booking)).toBe(
      "Olá, Camila! 💖 Seu horário no D’ELAS Studio de Beleza está confirmado! ✂️ Serviço: CORTE COM ESCOVA, ESCOVA 📅 Data: terça-feira, 08 de janeiro de 2030 🕒 Horário: 14:00 💇‍♀️ Profissional: Elaine Será um prazer receber você! Até lá! 🌸",
    );
  });

  it("abre o WhatsApp do número da cliente com o texto preenchido", () => {
    expect(confirmationWhatsAppLink(booking)).toBe(
      `https://wa.me/5511987654321?text=${encodeURIComponent(confirmationMessage(booking))}`,
    );
  });

  it("aceita número com +55 e devolve o mesmo destinatário", () => {
    expect(confirmationWhatsAppLink({ ...booking, phone: "+55 (11) 98765-4321" })).toBe(
      confirmationWhatsAppLink(booking),
    );
  });

  it("sem número válido (faltando DDD) não há link para enviar", () => {
    expect(confirmationWhatsAppLink({ ...booking, phone: "98765-4321" })).toBeNull();
    expect(confirmationWhatsAppLink({ ...booking, phone: "" })).toBeNull();
  });

  it("o profissional do cabelo é sempre Elaine", () => {
    expect(HAIR_PROFESSIONAL).toBe("Elaine");
    expect(confirmationMessage({ ...booking, name: "Iramar" })).toContain("Profissional: Elaine");
  });
});